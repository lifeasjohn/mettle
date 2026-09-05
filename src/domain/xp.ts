import type { ActivityKind, Verdict } from './types';

/**
 * XP is explicitly training VOLUME, not character. It is never used to drive the
 * virtue radar, which reads real signal instead (see radar.ts). Keeping these
 * separate is the difference between an honest progress display and a number
 * that flatters the user for opening the app.
 */

export const XP = {
  lesson: 20,
  /** Every check and rep right first try. */
  perfect: 10,
  quench: 15,
  /** A brittle verdict still earns: showing up and being scored badly is the rep. */
  spar: { tempered: 30, bending: 20, brittle: 10 } satisfies Record<Verdict, number>,
  /** Two or more distinct activity kinds in one day. */
  multi: 15,
} as const;

export function lessonXp(perfect: boolean): number {
  return XP.lesson + (perfect ? XP.perfect : 0);
}

export function sparXp(verdict: Verdict): number {
  return XP.spar[verdict];
}

/** Awarded once per day, the first time a second distinct activity kind lands. */
export function multiActivityBonus(kindsToday: readonly ActivityKind[]): number {
  return new Set(kindsToday).size >= 2 ? XP.multi : 0;
}

export interface LevelState {
  level: number;
  /** XP into the current level. */
  progress: number;
  /** XP needed to finish the current level. */
  needed: number;
}

/**
 * Levels widen as they go, so early sessions feel fast and later ones require
 * actual accumulation. Deliberately gentle: this is a retention affordance, not
 * a status system, and Mettle has no leaderboard for it to feed.
 */
export function levelFor(totalXp: number): LevelState {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  let needed = 100;

  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = Math.round(needed * 1.25);
  }

  return { level, progress: remaining, needed };
}
