import { chipById } from '../content';
import { todayISO, withinDays } from './dates';
import type { ISODate, QuenchEntry } from './types';

/**
 * The Seal: the single reflection line that closes the Quench.
 *
 * Generated client-side from chip history with no inference call, deliberately.
 * It runs every night on a tired person in bed, so it has to be instant and
 * free, and a templated line built from real counts is more trustworthy than a
 * generated one that might flatter.
 *
 * Rules are ordered, most specific first, and the first match wins.
 */

const WEEK = 7;

export interface SealInput {
  entry: Pick<QuenchEntry, 'heldChipIds' | 'ranChipIds' | 'date'>;
  /** Prior entries, excluding tonight's. */
  history: readonly QuenchEntry[];
  currentStreak: number;
}

const ordinal = (n: number): string =>
  ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'][n] ?? `${n}th`;

/** How many days this week carried a chip with the given trigger. */
function countThisWeek(
  history: readonly QuenchEntry[],
  today: ISODate,
  kind: 'held' | 'ran',
  trigger: string,
): number {
  return history.filter((e) => {
    if (!withinDays(e.date, today, WEEK)) return false;
    const ids = kind === 'held' ? e.heldChipIds : e.ranChipIds;
    return ids.some((id) => chipById.get(id)?.trigger === trigger);
  }).length;
}

export function buildSealLine(input: SealInput): string {
  const today = input.entry.date || todayISO();
  const heldChips = input.entry.heldChipIds.map((id) => chipById.get(id)).filter((c) => !!c);
  const ranChips = input.entry.ranChipIds.map((id) => chipById.get(id)).filter((c) => !!c);

  // A repeated hold this week is the strongest thing we can honestly say.
  for (const chip of heldChips) {
    const count = countThisWeek(input.history, today, 'held', chip.trigger) + 1;
    if (count >= 3) {
      return `${ordinal(count)} day this week you caught yourself. That is tempering.`;
    }
  }

  // A repeated miss, named without judgement. Naming it is the useful part.
  for (const chip of ranChips) {
    const count = countThisWeek(input.history, today, 'ran', chip.trigger) + 1;
    if (count >= 3) {
      return `${ordinal(count)} time this week. Not a failure. A pattern you can now see.`;
    }
  }

  if (heldChips.length > 0 && ranChips.length === 0) {
    return 'Held, with nothing to log against it. Those days count too.';
  }

  if (heldChips.length > 0 && ranChips.length > 0) {
    return 'Something held and something ran. That is what a training day looks like.';
  }

  if (ranChips.length > 0 && heldChips.length === 0) {
    return 'A hard one, logged honestly. Logging it is the part most people skip.';
  }

  if (input.currentStreak >= 7) {
    return `${input.currentStreak} days of showing up. The showing up is the whole method.`;
  }

  return 'Reviewed and closed. Back tomorrow.';
}
