import { buildEscalation } from '../../domain/spar-select';
import { freeEntitlement } from '../../domain/entitlement';
import { scoreHeuristically } from '../../domain/scoring-heuristic';
import type {
  Entitlement,
  ISODate,
  Intention,
  LessonProgress,
  QuenchEntry,
  SparSession,
  UserProfile,
  XpEvent,
} from '../../domain/types';
import { scoreWithGuardrail } from '../guardrail';
import type { EscalateRequest, Repository, ScoreRequest, SparScoreResult } from '../types';
import { appendJson, clearAll, readJson, writeJson } from './storage';

const KEYS = {
  profile: 'profile',
  entitlement: 'entitlement',
  lessons: 'lessons',
  intentions: 'intentions',
  quench: 'quench',
  spars: 'spars',
  concepts: 'concepts',
  xp: 'xp',
} as const;

/**
 * Fully offline adapter.
 *
 * Escalation composes from the scenario's authored templates and scoring uses
 * the heuristic scorer, so the three-round Arena is genuinely playable with no
 * backend and no API key. Swapping in Supabase changes the quality of the
 * escalations and the verdict, not the shape of anything the UI sees.
 */
export function createLocalRepository(): Repository {
  return {
    kind: 'local',

    async getProfile() {
      return readJson<UserProfile | null>(KEYS.profile, null);
    },
    async saveProfile(profile) {
      await writeJson(KEYS.profile, profile);
    },

    async getEntitlement() {
      return readJson<Entitlement>(KEYS.entitlement, freeEntitlement());
    },
    async saveEntitlement(entitlement) {
      await writeJson(KEYS.entitlement, entitlement);
    },

    async getLessonProgress() {
      return readJson<LessonProgress[]>(KEYS.lessons, []);
    },
    async completeLesson(progress) {
      const all = await readJson<LessonProgress[]>(KEYS.lessons, []);
      // Re-doing a lesson should not create a second completion row.
      const next = all.filter((p) => p.lessonId !== progress.lessonId);
      next.push(progress);
      await writeJson(KEYS.lessons, next);
    },

    async getIntentions() {
      return readJson<Intention[]>(KEYS.intentions, []);
    },
    async setIntention(intention) {
      const all = await readJson<Intention[]>(KEYS.intentions, []);
      const next = all.filter((i) => i.date !== intention.date);
      next.push(intention);
      await writeJson(KEYS.intentions, next);
    },
    async recordIntentionOutcome(date: ISODate, outcome) {
      const all = await readJson<Intention[]>(KEYS.intentions, []);
      await writeJson(
        KEYS.intentions,
        all.map((i) => (i.date === date ? { ...i, outcome } : i)),
      );
    },

    async getQuenchEntries() {
      return readJson<QuenchEntry[]>(KEYS.quench, []);
    },
    async saveQuenchEntry(entry) {
      const all = await readJson<QuenchEntry[]>(KEYS.quench, []);
      const next = all.filter((e) => e.date !== entry.date);
      next.push(entry);
      await writeJson(KEYS.quench, next);
    },

    async getSparSessions() {
      return readJson<SparSession[]>(KEYS.spars, []);
    },
    async saveSparSession(session) {
      await appendJson(KEYS.spars, session);
    },

    async escalate({ scenario, roundIndex, previousResponse }: EscalateRequest) {
      const template = scenario.escalations[roundIndex - 1]?.template ?? '';
      return buildEscalation(template, previousResponse);
    },

    async scoreSpar(request: ScoreRequest): Promise<SparScoreResult> {
      return scoreWithGuardrail(request, async ({ scenario, responses }) => {
        const { verdict, strength, miss } = scoreHeuristically({
          responses,
          targetConcepts: scenario.targetConcepts,
        });
        return { crisis: false, verdict, strength, miss };
      });
    },

    async peerResponse(scenarioId) {
      // Offline, the pool is the authored exemplars. The Supabase adapter reads
      // real Tempered responses from other users and falls back to these.
      const { scenarioById } = await import('../../content');
      const exemplars = scenarioById.get(scenarioId)?.exemplars ?? [];
      if (exemplars.length === 0) return null;
      return exemplars[Math.floor(Math.random() * exemplars.length)] ?? null;
    },

    async getDeliveredConcepts() {
      return readJson<string[]>(KEYS.concepts, []);
    },
    async markConceptDelivered(conceptId) {
      const all = await readJson<string[]>(KEYS.concepts, []);
      if (!all.includes(conceptId)) await writeJson(KEYS.concepts, [...all, conceptId]);
    },

    async getXpEvents() {
      return readJson<XpEvent[]>(KEYS.xp, []);
    },
    async addXpEvent(event) {
      await appendJson(KEYS.xp, event);
    },

    async reset() {
      await clearAll(Object.values(KEYS));
    },
  };
}
