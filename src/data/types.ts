import type { Scenario } from '../content/schema';
import type { CrisisCategory } from '../domain/crisis';
import type {
  Entitlement,
  ISODate,
  Intention,
  LessonProgress,
  QuenchEntry,
  SparSession,
  UserProfile,
  Verdict,
  XpEvent,
} from '../domain/types';

/**
 * The Repository is the seam between the app and wherever data actually lives.
 *
 * Two adapters implement it: a local one backed by AsyncStorage, and a Supabase
 * one. `src/data/index.ts` picks between them based on whether Supabase is
 * configured, which is what lets the whole product run and be demoed today
 * with no credentials and switch to a backend with no refactor.
 *
 * Screens must never import a storage client directly. Everything goes here.
 */

export interface EscalateRequest {
  scenario: Scenario;
  /** 1 for the second round, 2 for the third. */
  roundIndex: 1 | 2;
  /** What the user wrote in the previous round. Used against them. */
  previousResponse: string;
}

export interface ScoreRequest {
  scenario: Scenario;
  /** One response per round, in order. */
  responses: string[];
}

/**
 * A crisis result is a distinct shape rather than a flag on a verdict, so it is
 * impossible to render a verdict screen for text that tripped the guardrail.
 * The type system enforces what the product rule requires.
 */
export type SparScoreResult =
  | { crisis: true; category: CrisisCategory }
  | { crisis: false; verdict: Verdict; strength: string; miss: string };

export interface Repository {
  readonly kind: 'local' | 'supabase';

  getProfile(): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<void>;

  getEntitlement(): Promise<Entitlement>;
  saveEntitlement(entitlement: Entitlement): Promise<void>;

  getLessonProgress(): Promise<LessonProgress[]>;
  completeLesson(progress: LessonProgress): Promise<void>;

  getIntentions(): Promise<Intention[]>;
  setIntention(intention: Intention): Promise<void>;
  recordIntentionOutcome(date: ISODate, outcome: Intention['outcome']): Promise<void>;

  getQuenchEntries(): Promise<QuenchEntry[]>;
  saveQuenchEntry(entry: QuenchEntry): Promise<void>;

  getSparSessions(): Promise<SparSession[]>;
  saveSparSession(session: SparSession): Promise<void>;

  /** Builds the next round's prompt from the user's own previous answer. */
  escalate(request: EscalateRequest): Promise<string>;
  /** Screens for crisis first, always, then scores. */
  scoreSpar(request: ScoreRequest): Promise<SparScoreResult>;
  /** One anonymous Tempered response to the same scenario, or null if none exists. */
  peerResponse(scenarioId: string): Promise<string | null>;

  getDeliveredConcepts(): Promise<string[]>;
  markConceptDelivered(conceptId: string): Promise<void>;

  getXpEvents(): Promise<XpEvent[]>;
  addXpEvent(event: XpEvent): Promise<void>;

  /** Wipes local state. Used by the dev reset on the settings screen. */
  reset(): Promise<void>;
}
