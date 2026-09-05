import type { StrugglePath, Verdict, Virtue } from '../content/schema';

export type { StrugglePath, Verdict, Virtue };

/** Device-local calendar date, `YYYY-MM-DD`. Streaks are counted in these. */
export type ISODate = string;

/** ISO 8601 instant. */
export type Timestamp = string;

export type ActivityKind = 'lesson' | 'spar' | 'quench';

export interface LessonProgress {
  lessonId: string;
  completedAt: Timestamp;
  date: ISODate;
  /** Every check and rep correct on the first try. */
  perfect: boolean;
}

export interface Intention {
  id: string;
  date: ISODate;
  text: string;
  sourceLessonId: string | null;
  /** Filled in by the evening Quench. Null until then. */
  outcome: 'yes' | 'no' | 'sort_of' | null;
}

/**
 * `timeOfDay` and `setting` are optional single taps. They are the difference
 * between The Pattern saying "you took things personally 11 times" and saying
 * "9 of them were at work, after lunch". Skippable, so the 60-second floor holds.
 */
export interface QuenchEntry {
  id: string;
  date: ISODate;
  heldChipIds: string[];
  ranChipIds: string[];
  heldText: string | null;
  ranText: string | null;
  timeOfDay: TimeOfDay | null;
  setting: Setting | null;
  /** Templated client-side from chip history. Never an AI call. */
  sealLine: string;
  createdAt: Timestamp;
}

export const timesOfDay = ['morning', 'afternoon', 'evening'] as const;
export type TimeOfDay = (typeof timesOfDay)[number];

export const settings = ['work', 'home', 'out', 'online'] as const;
export type Setting = (typeof settings)[number];

export interface SparRound {
  /** Round 1 is the scenario opening; 2 and 3 are escalations built from the previous answer. */
  prompt: string;
  instinct: string | null;
  response: string;
}

export interface SparSession {
  id: string;
  scenarioId: string;
  path: StrugglePath;
  virtue: Virtue;
  targetConcepts: string[];
  rounds: SparRound[];
  verdict: Verdict;
  /** One sentence on what was Stoic. */
  strength: string;
  /** One sentence on the judgment that was missed. */
  miss: string;
  referenceAnswer: string;
  /** Anonymous peer response shown after the verdict, if one was available. */
  peerResponse: string | null;
  date: ISODate;
  createdAt: Timestamp;
}

export type XpSource = 'lesson' | 'perfect' | 'quench' | 'spar' | 'multi';

export interface XpEvent {
  id: string;
  amount: number;
  source: XpSource;
  virtue: Virtue;
  date: ISODate;
  createdAt: Timestamp;
}

export interface UserProfile {
  strugglePath: StrugglePath;
  /** Raw onboarding answers, kept for copy personalisation and analytics. */
  onboardingAnswers: Record<string, string>;
  minutesCommitment: 3 | 5 | 10;
  notificationTime: string;
  displayName: string | null;
  onboardedAt: Timestamp;
}

export interface Entitlement {
  status: 'free' | 'active';
  /** Spars consumed against the free allowance. Ignored once status is active. */
  sparsUsed: number;
}
