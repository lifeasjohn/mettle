import { conceptById, justInTimeConcepts } from '../content';
import type { Concept } from '../content/schema';
import type { SparSession } from './types';

/**
 * Just-in-time concept delivery.
 *
 * Ten of the fifteen concepts are never taught on a schedule. They surface at
 * the moment of failure: the user gets a Bending or Brittle verdict, and the
 * concept they actually missed appears right there, while the sting is live.
 *
 * Learning at the point of failure beats learning on a schedule, and it is why
 * the lesson ramp is five days instead of fifteen.
 */

export interface JitDelivery {
  concept: Concept;
  /** Why it surfaced, used for the card's eyebrow line. */
  reason: 'missed-target' | 'weak-area';
}

export function selectJitConcept(
  spar: { verdict: SparSession['verdict']; targetConcepts: readonly string[]; virtue: SparSession['virtue'] },
  seenConceptIds: ReadonlySet<string>,
): JitDelivery | null {
  // A tempered verdict means they applied it. Interrupting to teach would be
  // both wrong and patronising.
  if (spar.verdict === 'tempered') return null;

  // First choice: the concept this scenario was actually scoring against.
  for (const id of spar.targetConcepts) {
    const concept = conceptById.get(id);
    if (concept && !concept.taughtInLesson && !seenConceptIds.has(id)) {
      return { concept, reason: 'missed-target' };
    }
  }

  // Otherwise offer something unseen from the same virtue, which is the area
  // the verdict just showed to be thin.
  const sameVirtue = justInTimeConcepts.find(
    (c) => c.virtue === spar.virtue && !seenConceptIds.has(c.id),
  );
  if (sameVirtue) return { concept: sameVirtue, reason: 'weak-area' };

  return null;
}

/** Concepts the user has been shown, whether by lesson or just-in-time. */
export function conceptsSeen(
  completedLessonIds: readonly string[],
  deliveredConceptIds: readonly string[],
  lessonTeaches: (lessonId: string) => readonly string[],
): Set<string> {
  const seen = new Set<string>(deliveredConceptIds);
  for (const id of completedLessonIds) for (const c of lessonTeaches(id)) seen.add(c);
  return seen;
}
