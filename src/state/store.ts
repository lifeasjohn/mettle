import { create } from 'zustand';
import { lessonById } from '../content';
import { getRepository, newId } from '../data';
import type { SparScoreResult } from '../data/types';
import {
  consumeSpar,
  freeEntitlement,
  lessonXp,
  multiActivityBonus,
  sparXp,
  todayISO,
  type ActivityKind,
  type Entitlement,
  type Intention,
  type LessonProgress,
  type QuenchEntry,
  type SparSession,
  type UserProfile,
  type XpEvent,
} from '../domain';

/**
 * One store for everything the repository owns.
 *
 * Derived values (streak, radar, unlocks, patterns) are computed in selectors
 * rather than stored, so they can never drift from the rows they summarise.
 * Every write goes to the repository first and updates state from the result,
 * so a failed write cannot leave the UI claiming something happened.
 */

interface MettleState {
  hydrated: boolean;
  profile: UserProfile | null;
  entitlement: Entitlement;
  lessonProgress: LessonProgress[];
  intentions: Intention[];
  quenchEntries: QuenchEntry[];
  spars: SparSession[];
  deliveredConcepts: string[];
  xpEvents: XpEvent[];

  hydrate: () => Promise<void>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  completeLesson: (lessonId: string, perfect: boolean) => Promise<void>;
  setIntention: (text: string, sourceLessonId: string | null) => Promise<void>;
  saveQuench: (
    entry: Omit<QuenchEntry, 'id' | 'createdAt'>,
    intentionOutcome: Intention['outcome'],
  ) => Promise<void>;
  /** Returns the new session's id, so the share card can address it. */
  saveSpar: (spar: Omit<SparSession, 'id' | 'createdAt'>) => Promise<string>;
  markConceptDelivered: (conceptId: string) => Promise<void>;
  subscribe: () => Promise<void>;
  reset: () => Promise<void>;
}

const nowISO = () => new Date().toISOString();

export const useMettle = create<MettleState>()((set, get) => ({
  hydrated: false,
  profile: null,
  entitlement: freeEntitlement(),
  lessonProgress: [],
  intentions: [],
  quenchEntries: [],
  spars: [],
  deliveredConcepts: [],
  xpEvents: [],

  async hydrate() {
    const repo = getRepository();
    const [profile, entitlement, lessonProgress, intentions, quenchEntries, spars, deliveredConcepts, xpEvents] =
      await Promise.all([
        repo.getProfile(),
        repo.getEntitlement(),
        repo.getLessonProgress(),
        repo.getIntentions(),
        repo.getQuenchEntries(),
        repo.getSparSessions(),
        repo.getDeliveredConcepts(),
        repo.getXpEvents(),
      ]);

    set({
      hydrated: true,
      profile,
      entitlement,
      lessonProgress,
      intentions,
      quenchEntries,
      spars,
      deliveredConcepts,
      xpEvents,
    });
  },

  async saveProfile(profile) {
    await getRepository().saveProfile(profile);
    set({ profile });
  },

  async completeLesson(lessonId, perfect) {
    const repo = getRepository();
    const date = todayISO();
    const progress: LessonProgress = { lessonId, date, completedAt: nowISO(), perfect };

    await repo.completeLesson(progress);
    const virtue = lessonById.get(lessonId)?.virtue ?? 'wisdom';
    await awardXp(lessonXp(perfect), 'lesson', virtue, date);

    set((s) => ({
      lessonProgress: [...s.lessonProgress.filter((p) => p.lessonId !== lessonId), progress],
    }));
    await awardMultiBonus(date);
  },

  async setIntention(text, sourceLessonId) {
    const date = todayISO();
    const intention: Intention = { id: newId('int'), date, text, sourceLessonId, outcome: null };
    await getRepository().setIntention(intention);
    set((s) => ({ intentions: [...s.intentions.filter((i) => i.date !== date), intention] }));
  },

  async saveQuench(partial, intentionOutcome) {
    const repo = getRepository();
    const entry: QuenchEntry = { ...partial, id: newId('qch'), createdAt: nowISO() };

    await repo.saveQuenchEntry(entry);
    // The Quench credits temperance: showing up to review a bad day is the rep.
    await awardXp(15, 'quench', 'temperance', entry.date);

    // Tonight's review is what closes out this morning's intention.
    const intention = get().intentions.find((i) => i.date === entry.date);
    if (intention && intentionOutcome !== null) {
      await repo.recordIntentionOutcome(entry.date, intentionOutcome);
      set((s) => ({
        intentions: s.intentions.map((i) =>
          i.date === entry.date ? { ...i, outcome: intentionOutcome } : i,
        ),
      }));
    }

    set((s) => ({
      quenchEntries: [...s.quenchEntries.filter((e) => e.date !== entry.date), entry],
    }));
    await awardMultiBonus(entry.date);
  },

  async saveSpar(partial) {
    const repo = getRepository();
    const spar: SparSession = { ...partial, id: newId('spr'), createdAt: nowISO() };

    await repo.saveSparSession(spar);
    await awardXp(sparXp(spar.verdict), 'spar', spar.virtue, spar.date);

    // Charged on completion, never on start: an abandoned spar should not cost one.
    const entitlement = consumeSpar(get().entitlement);
    await repo.saveEntitlement(entitlement);

    set((s) => ({ spars: [...s.spars, spar], entitlement }));
    await awardMultiBonus(spar.date);
    return spar.id;
  },

  async markConceptDelivered(conceptId) {
    if (get().deliveredConcepts.includes(conceptId)) return;
    await getRepository().markConceptDelivered(conceptId);
    set((s) => ({ deliveredConcepts: [...s.deliveredConcepts, conceptId] }));
  },

  async subscribe() {
    const entitlement: Entitlement = { ...get().entitlement, status: 'active' };
    await getRepository().saveEntitlement(entitlement);
    set({ entitlement });
  },

  async reset() {
    await getRepository().reset();
    set({
      profile: null,
      entitlement: freeEntitlement(),
      lessonProgress: [],
      intentions: [],
      quenchEntries: [],
      spars: [],
      deliveredConcepts: [],
      xpEvents: [],
    });
  },
}));

async function awardXp(
  amount: number,
  source: XpEvent['source'],
  virtue: XpEvent['virtue'],
  date: string,
): Promise<void> {
  const event: XpEvent = { id: newId('xp'), amount, source, virtue, date, createdAt: nowISO() };
  await getRepository().addXpEvent(event);
  useMettle.setState((s) => ({ xpEvents: [...s.xpEvents, event] }));
}

/** Awarded once per day, the first time a second distinct activity kind lands. */
async function awardMultiBonus(date: string): Promise<void> {
  const state = useMettle.getState();
  if (state.xpEvents.some((e) => e.date === date && e.source === 'multi')) return;

  const kinds = activityKindsOn(state, date);
  if (multiActivityBonus(kinds) === 0) return;

  await awardXp(multiActivityBonus(kinds), 'multi', 'temperance', date);
}

function activityKindsOn(state: MettleState, date: string): ActivityKind[] {
  const kinds: ActivityKind[] = [];
  if (state.lessonProgress.some((p) => p.date === date)) kinds.push('lesson');
  if (state.spars.some((s) => s.date === date)) kinds.push('spar');
  if (state.quenchEntries.some((q) => q.date === date)) kinds.push('quench');
  return kinds;
}

// ---------------------------------------------------------------------------
// Selectors
//
// Only values that are primitives or stable references belong here. Anything
// that builds a new object or Set must be a memoised hook in ./hooks.ts, or
// zustand's useSyncExternalStore will re-render forever. See the note there.
// ---------------------------------------------------------------------------

export const selectTotalXp = (state: MettleState): number =>
  state.xpEvents.reduce((sum, e) => sum + e.amount, 0);

export const selectTodayIntention = (state: MettleState): Intention | null =>
  state.intentions.find((i) => i.date === todayISO()) ?? null;

export const selectQuenchDoneToday = (state: MettleState): boolean =>
  state.quenchEntries.some((e) => e.date === todayISO());

export type { SparScoreResult };
