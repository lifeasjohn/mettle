import { addDays, daysBetween, todayISO } from './dates';
import type { ActivityKind, ISODate } from './types';

/**
 * Streaks are practice-based, never outcome-based. A day counts if the user did
 * ANY one of: a lesson, a spar, or a Quench. This matters: an outcome-based
 * streak ("did you stay calm?") would punish honest self-reporting, which is
 * the one behaviour the whole product depends on.
 *
 * No streak freezes. A missed day is a missed day, and the app should be
 * straight with people about that.
 */

export interface StreakState {
  current: number;
  longest: number;
  /** True when today already counts, so Today can stop nagging. */
  aliveToday: boolean;
  /** True when yesterday counted but today has not yet. The day is still winnable. */
  atRisk: boolean;
}

export interface DayActivity {
  date: ISODate;
  kinds: ActivityKind[];
}

/** Distinct dates on which anything at all was completed, newest first is not required. */
export function activeDates(days: readonly DayActivity[]): ISODate[] {
  const set = new Set<ISODate>();
  for (const d of days) if (d.kinds.length > 0) set.add(d.date);
  return [...set].sort();
}

export function computeStreak(
  days: readonly DayActivity[],
  today: ISODate = todayISO(),
): StreakState {
  const dates = activeDates(days);
  if (dates.length === 0) {
    return { current: 0, longest: 0, aliveToday: false, atRisk: false };
  }

  const active = new Set(dates);
  const aliveToday = active.has(today);
  const yesterday = addDays(today, -1);

  // Count back from today if today counts, otherwise from yesterday. Anything
  // older than that means the streak has already lapsed.
  let cursor = aliveToday ? today : active.has(yesterday) ? yesterday : null;
  let current = 0;
  while (cursor && active.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  // Longest run anywhere in history, which may predate the current one.
  let longest = 0;
  let run = 0;
  let prev: ISODate | null = null;
  for (const d of dates) {
    run = prev !== null && daysBetween(prev, d) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = d;
  }

  return {
    current,
    longest: Math.max(longest, current),
    aliveToday,
    atRisk: !aliveToday && current > 0,
  };
}
