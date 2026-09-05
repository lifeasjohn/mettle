import { conceptById, scenarioById } from '../../content';
import { freeEntitlement } from '../../domain/entitlement';
import { buildEscalation } from '../../domain/spar-select';
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
import { ensureSession, supabase } from './client';

/**
 * Supabase adapter.
 *
 * Satisfies exactly the same Repository interface as the local adapter, so no
 * screen changes when this is switched on. Two differences that matter:
 *
 * - Escalation and scoring call the edge functions instead of the offline
 *   heuristic, which is where the quality jump lives.
 * - Peer responses come from other real users (moderated) rather than only the
 *   authored exemplars, with those exemplars as the fallback.
 *
 * Every read is filtered by user_id in addition to RLS. The policies are the
 * actual protection; the filters are there so a missing policy shows up as
 * wrong data in development rather than as a silent leak in production.
 */

const asDate = (d: string): ISODate => d.slice(0, 10);

async function uid(): Promise<string> {
  const id = await ensureSession();
  if (!id) throw new Error('No Supabase session');
  return id;
}

export function createSupabaseRepository(): Repository {
  return {
    kind: 'supabase',

    async getProfile() {
      const user = await uid();
      const { data } = await supabase()
        .from('profiles')
        .select('*')
        .eq('user_id', user)
        .maybeSingle();
      if (!data) return null;

      return {
        strugglePath: data.struggle_path,
        onboardingAnswers: data.onboarding_answers ?? {},
        minutesCommitment: data.minutes_commitment,
        notificationTime: data.notification_time,
        displayName: data.display_name,
        onboardedAt: data.onboarded_at,
      } satisfies UserProfile;
    },

    async saveProfile(profile) {
      const user = await uid();
      await supabase().from('profiles').upsert({
        user_id: user,
        struggle_path: profile.strugglePath,
        onboarding_answers: profile.onboardingAnswers,
        minutes_commitment: profile.minutesCommitment,
        notification_time: profile.notificationTime,
        display_name: profile.displayName,
        onboarded_at: profile.onboardedAt,
      });
    },

    async getEntitlement() {
      const user = await uid();
      const { data } = await supabase()
        .from('entitlements')
        .select('status, spars_used')
        .eq('user_id', user)
        .maybeSingle();
      if (!data) return freeEntitlement();
      return { status: data.status, sparsUsed: data.spars_used } satisfies Entitlement;
    },

    async saveEntitlement(entitlement) {
      const user = await uid();
      await supabase()
        .from('entitlements')
        .upsert({ user_id: user, status: entitlement.status, spars_used: entitlement.sparsUsed });
    },

    async getLessonProgress() {
      const user = await uid();
      const { data } = await supabase()
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user);
      return (data ?? []).map<LessonProgress>((r) => ({
        lessonId: r.lesson_id,
        date: asDate(r.date),
        completedAt: r.completed_at,
        perfect: r.perfect,
      }));
    },

    async completeLesson(progress) {
      const user = await uid();
      await supabase().from('lesson_progress').upsert({
        user_id: user,
        lesson_id: progress.lessonId,
        date: progress.date,
        completed_at: progress.completedAt,
        perfect: progress.perfect,
      });
    },

    async getIntentions() {
      const user = await uid();
      const { data } = await supabase().from('intentions').select('*').eq('user_id', user);
      return (data ?? []).map<Intention>((r) => ({
        id: r.id,
        date: asDate(r.date),
        text: r.body,
        sourceLessonId: r.source_lesson_id,
        outcome: r.outcome,
      }));
    },

    async setIntention(intention) {
      const user = await uid();
      await supabase().from('intentions').upsert(
        {
          user_id: user,
          date: intention.date,
          body: intention.text,
          source_lesson_id: intention.sourceLessonId,
          outcome: intention.outcome,
        },
        { onConflict: 'user_id,date' },
      );
    },

    async recordIntentionOutcome(date, outcome) {
      const user = await uid();
      await supabase()
        .from('intentions')
        .update({ outcome })
        .eq('user_id', user)
        .eq('date', date);
    },

    async getQuenchEntries() {
      const user = await uid();
      const { data } = await supabase().from('quench_entries').select('*').eq('user_id', user);
      return (data ?? []).map<QuenchEntry>((r) => ({
        id: r.id,
        date: asDate(r.date),
        heldChipIds: r.held_chip_ids ?? [],
        ranChipIds: r.ran_chip_ids ?? [],
        heldText: r.held_text,
        ranText: r.ran_text,
        timeOfDay: r.time_of_day,
        setting: r.setting,
        sealLine: r.seal_line,
        createdAt: r.created_at,
      }));
    },

    async saveQuenchEntry(entry) {
      const user = await uid();
      await supabase().from('quench_entries').upsert(
        {
          user_id: user,
          date: entry.date,
          held_chip_ids: entry.heldChipIds,
          ran_chip_ids: entry.ranChipIds,
          held_text: entry.heldText,
          ran_text: entry.ranText,
          time_of_day: entry.timeOfDay,
          setting: entry.setting,
          seal_line: entry.sealLine,
        },
        { onConflict: 'user_id,date' },
      );
    },

    async getSparSessions() {
      const user = await uid();
      const { data } = await supabase()
        .from('spar_sessions')
        .select('*')
        .eq('user_id', user)
        .order('created_at', { ascending: true });
      return (data ?? []).map<SparSession>((r) => ({
        id: r.id,
        scenarioId: r.scenario_id,
        path: r.path,
        virtue: r.virtue,
        targetConcepts: r.target_concepts ?? [],
        rounds: r.rounds ?? [],
        verdict: r.verdict,
        strength: r.strength,
        miss: r.miss,
        referenceAnswer: r.reference_answer,
        peerResponse: r.peer_response,
        date: asDate(r.date),
        createdAt: r.created_at,
      }));
    },

    async saveSparSession(session) {
      const user = await uid();
      await supabase().from('spar_sessions').insert({
        user_id: user,
        scenario_id: session.scenarioId,
        path: session.path,
        virtue: session.virtue,
        target_concepts: session.targetConcepts,
        rounds: session.rounds,
        verdict: session.verdict,
        strength: session.strength,
        miss: session.miss,
        reference_answer: session.referenceAnswer,
        peer_response: session.peerResponse,
        date: session.date,
      });
    },

    async escalate({ scenario, roundIndex, previousResponse }: EscalateRequest) {
      const fallback = buildEscalation(
        scenario.escalations[roundIndex - 1]?.template ?? '',
        previousResponse,
      );

      try {
        const { data, error } = await supabase().functions.invoke('arena-escalate', {
          body: {
            opening: scenario.opening,
            previousResponse,
            roundIndex,
            fallback,
          },
        });
        if (error || !data) return fallback;
        // A crisis detected here still needs a prompt to render; scoring will
        // stop the session, and the client-side screen already ran.
        return typeof data.escalation === 'string' && data.escalation.length > 0
          ? data.escalation
          : fallback;
      } catch {
        return fallback;
      }
    },

    async scoreSpar(request: ScoreRequest): Promise<SparScoreResult> {
      return scoreWithGuardrail(request, async ({ scenario, responses }) => {
        const { data, error } = await supabase().functions.invoke('arena-score', {
          body: {
            opening: scenario.opening,
            targetConcepts: scenario.targetConcepts.map((id) => {
              const c = conceptById.get(id);
              return { id, name: c?.name, summary: c?.summary, cues: c?.cues };
            }),
            rounds: responses.map((response, i) => ({
              prompt: i === 0 ? scenario.opening : '',
              response,
            })),
          },
        });

        if (error || !data) {
          return {
            crisis: false,
            verdict: 'bending',
            strength: 'You stayed in it and answered rather than deflecting.',
            miss: 'Scoring did not come back, so this one is unjudged.',
          };
        }

        if (data.crisis) return { crisis: true, category: 'self-harm' };

        return {
          crisis: false,
          verdict: data.verdict,
          strength: data.strength,
          miss: data.miss,
        };
      });
    },

    async peerResponse(scenarioId) {
      const exemplars = scenarioById.get(scenarioId)?.exemplars ?? [];
      const fallback = exemplars[Math.floor(Math.random() * exemplars.length)] ?? null;

      try {
        // Security-definer function: returns one moderated body and nothing
        // else, so authorship cannot leak through a column.
        const { data, error } = await supabase().rpc('peer_response', {
          p_scenario_id: scenarioId,
        });
        if (error || typeof data !== 'string' || data.length === 0) return fallback;
        return data;
      } catch {
        return fallback;
      }
    },

    async getDeliveredConcepts() {
      const user = await uid();
      const { data } = await supabase()
        .from('concept_deliveries')
        .select('concept_id')
        .eq('user_id', user);
      return (data ?? []).map((r) => r.concept_id);
    },

    async markConceptDelivered(conceptId) {
      const user = await uid();
      await supabase()
        .from('concept_deliveries')
        .upsert({ user_id: user, concept_id: conceptId });
    },

    async getXpEvents() {
      const user = await uid();
      const { data } = await supabase().from('xp_events').select('*').eq('user_id', user);
      return (data ?? []).map<XpEvent>((r) => ({
        id: r.id,
        amount: r.amount,
        source: r.source,
        virtue: r.virtue,
        date: asDate(r.date),
        createdAt: r.created_at,
      }));
    },

    async addXpEvent(event) {
      const user = await uid();
      await supabase().from('xp_events').insert({
        user_id: user,
        amount: event.amount,
        source: event.source,
        virtue: event.virtue,
        date: event.date,
      });
    },

    async reset() {
      // Deliberately not implemented against a real backend: the local adapter
      // has it for development, and a one-tap "delete everything" against
      // production data is not a button worth shipping by accident.
      throw new Error('reset is not available against Supabase');
    },
  };
}
