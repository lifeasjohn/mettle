import type { StrugglePath } from '../../domain/types';

/**
 * Onboarding is data, not twelve route files.
 *
 * Reordering, cutting, or A/B testing a screen is then an edit to this array
 * rather than a routing change, which matters because onboarding is the single
 * most-iterated surface in an app like this.
 *
 * Twelve screens, one tap each, no typing. After screen 2 nothing is generic:
 * every subsequent screen echoes what they told us.
 *
 * Note the ending. The old plan closed on a hard paywall. The paywall is now
 * metered on the fourth spar, so screen 12 hands the user into lesson 1 and a
 * real spar instead of asking for money before anything has been proven.
 */

export type Answers = Partial<Record<string, string>>;

export interface Option {
  value: string;
  label: string;
  sub?: string;
}

export type Step =
  | { kind: 'statement'; id: string; eyebrow?: string; title: string; body?: string; cta: string }
  | {
      kind: 'choice';
      id: string;
      /** Key the answer is stored under. `path` drives all personalisation. */
      key: string;
      eyebrow?: string;
      title: (a: Answers) => string;
      options: (a: Answers) => Option[];
    }
  | { kind: 'plan'; id: string }
  | { kind: 'timeline'; id: string }
  | { kind: 'commit'; id: string }
  | { kind: 'handoff'; id: string };

export const PATH_LABEL: Record<StrugglePath, string> = {
  anger: 'anger',
  anxiety: 'anxiety',
  distraction: 'distraction',
  discipline: 'discipline',
};

/** Used across the plan reveal, notification copy, and paywall framing. */
export const PATH_NOUN: Record<StrugglePath, string> = {
  anger: 'Anger',
  anxiety: 'Anxiety',
  distraction: 'Distraction',
  discipline: 'Discipline',
};

const DEPTH: Record<StrugglePath, { title: string; options: Option[] }> = {
  anger: {
    title: 'Where does it come out?',
    options: [
      { value: 'work', label: 'At work' },
      { value: 'family', label: 'With family' },
      { value: 'partner', label: 'With my partner' },
      { value: 'strangers', label: 'With strangers' },
    ],
  },
  anxiety: {
    title: 'When does it hit hardest?',
    options: [
      { value: 'work', label: 'Work' },
      { value: 'relationships', label: 'Relationships' },
      { value: 'money', label: 'Money' },
      { value: 'future', label: 'The future' },
    ],
  },
  distraction: {
    title: 'Where does the time actually go?',
    options: [
      { value: 'phone', label: 'My phone' },
      { value: 'switching', label: 'Switching between things' },
      { value: 'avoidance', label: 'Avoiding one specific task' },
      { value: 'evenings', label: 'Whole evenings' },
    ],
  },
  discipline: {
    title: 'Where does it break down?',
    options: [
      { value: 'starting', label: 'Starting' },
      { value: 'week-two', label: 'Around week two' },
      { value: 'bad-day', label: 'The first bad day' },
      { value: 'no-result', label: 'When results are slow' },
    ],
  },
};

const asPath = (a: Answers): StrugglePath => (a.path as StrugglePath) ?? 'anxiety';

export const steps: Step[] = [
  {
    kind: 'statement',
    id: 'open',
    eyebrow: 'Mettle',
    title: 'Most people are ruled by their reactions.',
    body: 'Stoics trained out of it. Not by reading more. By doing reps, daily, for years.',
    cta: 'Start',
  },
  {
    kind: 'choice',
    id: 'path',
    key: 'path',
    eyebrow: 'One question',
    title: () => "What's ruling you right now?",
    options: () => [
      { value: 'anger', label: 'Anger', sub: 'It comes out faster than I decide' },
      { value: 'anxiety', label: 'Anxiety', sub: 'I rehearse things that never happen' },
      { value: 'distraction', label: 'Distraction', sub: 'I lose hours I meant to use' },
      { value: 'discipline', label: 'Lack of discipline', sub: 'I know what to do and do not do it' },
    ],
  },
  {
    kind: 'choice',
    id: 'depth',
    key: 'depth',
    title: (a) => DEPTH[asPath(a)].title,
    options: (a) => DEPTH[asPath(a)].options,
  },
  {
    kind: 'choice',
    id: 'frequency',
    key: 'frequency',
    title: () => 'How often does it cost you a good day?',
    options: () => [
      { value: 'daily', label: 'Most days' },
      { value: 'weekly', label: 'A few times a week' },
      { value: 'monthly', label: 'Now and then, but it lands hard' },
    ],
  },
  {
    kind: 'choice',
    id: 'cost',
    key: 'cost',
    title: () => 'What has it cost you most?',
    options: () => [
      { value: 'sleep', label: 'Sleep' },
      { value: 'focus', label: 'Focus' },
      { value: 'relationships', label: 'Relationships' },
      { value: 'confidence', label: 'Confidence' },
    ],
  },
  {
    kind: 'choice',
    id: 'tried',
    key: 'tried',
    title: () => 'What have you already tried?',
    options: () => [
      { value: 'meditation', label: 'Meditation apps' },
      { value: 'books', label: 'Books' },
      { value: 'therapy', label: 'Therapy' },
      { value: 'willpower', label: 'Willpower' },
    ],
  },
  {
    kind: 'statement',
    id: 'differentiation',
    eyebrow: 'Why this is different',
    title: 'Quotes do not change you. Reps do.',
    body: 'You already know more Stoicism than you use. Mettle puts you in the situation and scores what you actually say.',
    cta: 'Go on',
  },
  {
    kind: 'choice',
    id: 'minutes',
    key: 'minutes',
    title: () => 'How long can you train, on your worst day?',
    options: () => [
      { value: '3', label: '3 minutes', sub: 'Be honest. This is the number that matters' },
      { value: '5', label: '5 minutes' },
      { value: '10', label: '10 minutes' },
    ],
  },
  { kind: 'plan', id: 'plan' },
  { kind: 'timeline', id: 'timeline' },
  { kind: 'commit', id: 'commit' },
  { kind: 'handoff', id: 'handoff' },
];

export const TOTAL_STEPS = steps.length;
