import { chipById, lessonById } from '../content';
import { virtues } from '../content/schema';
import { todayISO, withinDays } from './dates';
import type { ISODate, LessonProgress, QuenchEntry, SparSession, Virtue } from './types';

/**
 * The virtue radar reads real signal, not training volume.
 *
 * The obvious implementation is to sum XP per virtue, and it is wrong: it
 * measures how much someone used the app and labels the result "character".
 * Instead each input is weighted by what it actually evidences:
 *
 *   - an Arena verdict is the strongest signal available, because the user
 *     produced a response under pressure and it was judged against a concept
 *   - a "held the line" Quench chip is a real self-report about the world
 *   - a "judgment ran me" chip credits nothing; it is diagnostic, and feeds
 *     spar selection instead of the radar
 *   - a completed lesson credits a little, so the radar is not empty on day one
 *
 * The window is rolling, so the radar shows current state rather than a
 * lifetime total that can only ever go up.
 */

export const RADAR_WINDOW_DAYS = 30;

const VERDICT_WEIGHT = { tempered: 3, bending: 1, brittle: 0 } as const;
const HELD_CHIP_WEIGHT = 1;
const LESSON_WEIGHT = 1;

export type VirtueScores = Record<Virtue, number>;

const emptyScores = (): VirtueScores => ({ wisdom: 0, courage: 0, temperance: 0, justice: 0 });

export interface RadarInput {
  spars: readonly SparSession[];
  quench: readonly QuenchEntry[];
  lessons: readonly LessonProgress[];
}

export function computeRadar(
  input: RadarInput,
  today: ISODate = todayISO(),
  windowDays: number = RADAR_WINDOW_DAYS,
): VirtueScores {
  const scores = emptyScores();
  const inWindow = (d: ISODate) => withinDays(d, today, windowDays);

  for (const spar of input.spars) {
    if (!inWindow(spar.date)) continue;
    scores[spar.virtue] += VERDICT_WEIGHT[spar.verdict];
  }

  for (const entry of input.quench) {
    if (!inWindow(entry.date)) continue;
    for (const chipId of entry.heldChipIds) {
      const chip = chipById.get(chipId);
      // 'ran' chips are diagnostic only and must never credit a virtue.
      if (chip?.kind === 'held') scores[chip.virtue] += HELD_CHIP_WEIGHT;
    }
  }

  for (const lesson of input.lessons) {
    if (!inWindow(lesson.date)) continue;
    const virtue = lessonById.get(lesson.lessonId)?.virtue;
    if (virtue) scores[virtue] += LESSON_WEIGHT;
  }

  return scores;
}

/**
 * Scales scores to 0..1 for the chart. Normalising against the strongest virtue
 * would always show one axis at full, implying mastery the data does not
 * support, so this scales against a fixed reference instead and clamps.
 */
export const RADAR_FULL_SCALE = 24;

export function normaliseRadar(scores: VirtueScores, fullScale = RADAR_FULL_SCALE): VirtueScores {
  const out = emptyScores();
  for (const v of virtues) out[v] = Math.min(1, scores[v] / fullScale);
  return out;
}

/** The virtue with the least evidence behind it. Used to bias spar selection. */
export function weakestVirtue(scores: VirtueScores): Virtue {
  return virtues.reduce((weakest, v) => (scores[v] < scores[weakest] ? v : weakest), virtues[0]);
}

/** True when there is too little evidence to draw anything honest. */
export function radarHasEnoughData(scores: VirtueScores): boolean {
  return virtues.reduce((sum, v) => sum + scores[v], 0) >= 6;
}
