import { lessons } from '../content';
import type { LessonProgress } from './types';

/**
 * The Arena unlocks after lesson 1, not lesson 5.
 *
 * Lesson 1 teaches the dichotomy of control, which is enough to score a
 * response against. Holding the differentiated feature back for five days
 * buries it behind the least differentiated part of the product, so day one is
 * deliberately lesson 1 plus a real spar.
 */
export const ARENA_UNLOCKS_AFTER_LESSONS = 1;

export interface UnlockState {
  arenaUnlocked: boolean;
  completedCount: number;
  /** The next lesson to do, or null when all five are done. */
  nextLessonId: string | null;
  allLessonsComplete: boolean;
}

export function computeUnlocks(progress: readonly LessonProgress[]): UnlockState {
  const done = new Set(progress.map((p) => p.lessonId));
  const next = lessons.find((l) => !done.has(l.id)) ?? null;

  return {
    arenaUnlocked: done.size >= ARENA_UNLOCKS_AFTER_LESSONS,
    completedCount: done.size,
    nextLessonId: next?.id ?? null,
    allLessonsComplete: next === null,
  };
}

/** Lessons run in order; a later one is not reachable until its predecessors are done. */
export function isLessonAvailable(lessonId: string, progress: readonly LessonProgress[]): boolean {
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) return false;
  const done = new Set(progress.map((p) => p.lessonId));
  return lessons
    .filter((l) => l.order < lesson.order)
    .every((l) => done.has(l.id));
}
