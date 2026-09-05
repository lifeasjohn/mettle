import type { LessonProgress, QuenchEntry, SparSession, Verdict, Virtue } from './types';

/** Factories for domain tests. Not imported by app code. */

export function quench(
  date: string,
  opts: Partial<Omit<QuenchEntry, 'date'>> = {},
): QuenchEntry {
  return {
    id: `q-${date}-${Math.random().toString(36).slice(2, 7)}`,
    date,
    heldChipIds: [],
    ranChipIds: [],
    heldText: null,
    ranText: null,
    timeOfDay: null,
    setting: null,
    sealLine: '',
    createdAt: `${date}T21:00:00.000Z`,
    ...opts,
  };
}

export function spar(
  date: string,
  verdict: Verdict,
  virtue: Virtue,
  targetConcepts: string[] = ['dichotomy-of-control'],
): SparSession {
  return {
    id: `s-${date}-${verdict}-${Math.random().toString(36).slice(2, 7)}`,
    scenarioId: 'anger-01',
    path: 'anger',
    virtue,
    targetConcepts,
    rounds: [],
    verdict,
    strength: '',
    miss: '',
    referenceAnswer: '',
    peerResponse: null,
    date,
    createdAt: `${date}T12:00:00.000Z`,
  };
}

export function lessonDone(date: string, lessonId: string, perfect = false): LessonProgress {
  return { lessonId, date, completedAt: `${date}T08:00:00.000Z`, perfect };
}
