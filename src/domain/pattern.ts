import { chipById, conceptById } from '../content';
import { dayOfWeek, todayISO, weekdayNames, withinDays } from './dates';
import type { ISODate, QuenchEntry, SparSession, Setting, TimeOfDay } from './types';

/**
 * The Pattern.
 *
 * This is the retention argument and the one thing a competitor cannot copy,
 * because it is a dataset about the user rather than a library of content.
 * "You completed 15 lessons" is worthless. "You reported taking things
 * personally 11 times, 9 of them at work, and Thursday is always the worst" is
 * a reason to keep the subscription.
 *
 * Two rules govern everything here, and neither is negotiable:
 *
 * 1. Never claim an outcome the app cannot measure. Self-reported chips are
 *    evidence of what someone reported, not of what happened, and every string
 *    below is phrased that way. There is no "your anxiety is down 30%" and
 *    there never will be.
 * 2. Say nothing until there is enough data to say it honestly. Under the
 *    thresholds, the surface reports that it is still gathering rather than
 *    inventing a finding from three data points.
 */

export const PATTERN_WINDOW_DAYS = 30;
/** Below this, no findings are reported at all. */
const MIN_ENTRIES = 5;
/** A trigger needs this many occurrences before it is named. */
const MIN_TRIGGER_COUNT = 3;
/** A concentration needs this share of occurrences to be worth reporting. */
const CONCENTRATION_THRESHOLD = 0.6;

export type InsightKind = 'trigger' | 'setting' | 'time' | 'weekday' | 'held' | 'arena';

export interface PatternInsight {
  id: string;
  kind: InsightKind;
  headline: string;
  detail: string;
  /** 'emerging' findings are shown with a visible caveat. */
  confidence: 'emerging' | 'established';
}

export interface PatternReport {
  hasEnoughData: boolean;
  entriesInWindow: number;
  /** How many more Quench entries are needed before findings appear. */
  entriesNeeded: number;
  insights: PatternInsight[];
}

const TIME_LABEL: Record<TimeOfDay, string> = {
  morning: 'in the morning',
  afternoon: 'in the afternoon',
  evening: 'in the evening',
};

const SETTING_LABEL: Record<Setting, string> = {
  work: 'at work',
  home: 'at home',
  out: 'out of the house',
  online: 'online',
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Counts occurrences and returns the most common entry, or null on a tie at zero. */
function topOf<T>(items: readonly T[]): { value: T; count: number } | null {
  if (items.length === 0) return null;
  const counts = new Map<T, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  let best: { value: T; count: number } | null = null;
  for (const [value, count] of counts) {
    if (!best || count > best.count) best = { value, count };
  }
  return best;
}

export function analysePatterns(
  quench: readonly QuenchEntry[],
  spars: readonly SparSession[],
  today: ISODate = todayISO(),
  windowDays: number = PATTERN_WINDOW_DAYS,
): PatternReport {
  const entries = quench.filter((e) => withinDays(e.date, today, windowDays));

  if (entries.length < MIN_ENTRIES) {
    return {
      hasEnoughData: false,
      entriesInWindow: entries.length,
      entriesNeeded: MIN_ENTRIES - entries.length,
      insights: [],
    };
  }

  const insights: PatternInsight[] = [];

  // --- what runs you --------------------------------------------------------
  // Each entry contributes a trigger at most once, so one bad day cannot
  // manufacture a pattern by selecting several chips that share a tag.
  const ranOccurrences = entries.flatMap((e) => {
    const triggers = new Set(
      e.ranChipIds.map((id) => chipById.get(id)?.trigger).filter((t): t is string => !!t),
    );
    return [...triggers].map((trigger) => ({ trigger, entry: e }));
  });

  const topTrigger = topOf(ranOccurrences.map((o) => o.trigger));

  if (topTrigger && topTrigger.count >= MIN_TRIGGER_COUNT) {
    const matching = ranOccurrences.filter((o) => o.trigger === topTrigger.value);
    const label = triggerLabel(topTrigger.value);
    const confidence = topTrigger.count >= 6 ? 'established' : 'emerging';

    insights.push({
      id: `trigger:${topTrigger.value}`,
      kind: 'trigger',
      headline: `You reported ${label} ${topTrigger.count} ${plural(topTrigger.count, 'time', 'times')}.`,
      detail: `Across ${entries.length} evenings, that is your most reported judgment. It is the one worth watching for.`,
      confidence,
    });

    // Where it happens.
    const settings = matching
      .map((o) => o.entry.setting)
      .filter((s): s is Setting => s !== null);
    const topSetting = topOf(settings);
    if (topSetting && settings.length >= MIN_TRIGGER_COUNT && topSetting.count / settings.length >= CONCENTRATION_THRESHOLD) {
      insights.push({
        id: `setting:${topTrigger.value}`,
        kind: 'setting',
        headline: `It is concentrated ${SETTING_LABEL[topSetting.value]}.`,
        detail: `${topSetting.count} of the ${settings.length} times you logged a setting for it.`,
        confidence: topSetting.count >= 5 ? 'established' : 'emerging',
      });
    }

    // When it happens.
    const times = matching.map((o) => o.entry.timeOfDay).filter((t): t is TimeOfDay => t !== null);
    const topTime = topOf(times);
    if (topTime && times.length >= MIN_TRIGGER_COUNT && topTime.count / times.length >= CONCENTRATION_THRESHOLD) {
      insights.push({
        id: `time:${topTrigger.value}`,
        kind: 'time',
        headline: `It lands ${TIME_LABEL[topTime.value]}.`,
        detail: `${topTime.count} of the ${times.length} times you logged when it hit.`,
        confidence: topTime.count >= 5 ? 'established' : 'emerging',
      });
    }

    // Which day.
    const weekdays = matching.map((o) => dayOfWeek(o.entry.date));
    const topDay = topOf(weekdays);
    if (topDay && weekdays.length >= 4 && topDay.count / weekdays.length >= 0.4) {
      insights.push({
        id: `weekday:${topTrigger.value}`,
        kind: 'weekday',
        headline: `${weekdayNames[topDay.value]} shows up more than any other day.`,
        detail: `${topDay.count} of ${weekdays.length} occurrences. Worth setting an intention for specifically.`,
        confidence: topDay.count >= 4 ? 'established' : 'emerging',
      });
    }
  }

  // --- what holds -----------------------------------------------------------
  const heldOccurrences = entries.flatMap((e) => {
    const triggers = new Set(
      e.heldChipIds.map((id) => chipById.get(id)?.trigger).filter((t): t is string => !!t),
    );
    return [...triggers];
  });
  const topHeld = topOf(heldOccurrences);

  if (topHeld && topHeld.count >= MIN_TRIGGER_COUNT) {
    insights.push({
      id: `held:${topHeld.value}`,
      kind: 'held',
      headline: `You held the line on ${heldLabel(topHeld.value)} ${topHeld.count} ${plural(topHeld.count, 'time', 'times')}.`,
      detail: `Your most consistent report over ${entries.length} evenings.`,
      confidence: topHeld.count >= 6 ? 'established' : 'emerging',
    });
  }

  // --- the Arena ------------------------------------------------------------
  const recentSpars = spars.filter((s) => withinDays(s.date, today, windowDays));
  if (recentSpars.length >= 3) {
    const missed = recentSpars
      .filter((s) => s.verdict !== 'tempered')
      .flatMap((s) => s.targetConcepts);
    const topMissed = topOf(missed);

    if (topMissed && topMissed.count >= 2) {
      const name = conceptById.get(topMissed.value)?.name ?? topMissed.value;
      insights.push({
        id: `arena:${topMissed.value}`,
        kind: 'arena',
        headline: `${name} is where the Arena keeps catching you.`,
        detail: `${topMissed.count} of your ${recentSpars.length} recent spars turned on it.`,
        confidence: topMissed.count >= 4 ? 'established' : 'emerging',
      });
    }
  }

  return {
    hasEnoughData: true,
    entriesInWindow: entries.length,
    entriesNeeded: 0,
    insights,
  };
}

const TRIGGER_LABELS: Record<string, string> = {
  'took-personally': 'taking something personally',
  'spun-story': 'spinning a story',
  reaction: 'reacting before thinking',
  avoidance: 'avoiding something',
  comparison: 'comparing yourself to someone',
  approval: 'needing someone to agree with you',
  'lost-time': 'losing time you meant to use',
};

const HELD_LABELS: Record<string, string> = {
  pressure: 'staying calm under pressure',
  'letting-go': 'letting something go',
  reaction: 'pausing before reacting',
  commitment: 'keeping a commitment',
  avoidance: 'starting something you were avoiding',
  honesty: 'saying the hard thing kindly',
  presence: 'actually listening',
  clarity: 'seeing it for what it was',
};

const triggerLabel = (t: string) => TRIGGER_LABELS[t] ?? t.replace(/-/g, ' ');
const heldLabel = (t: string) => HELD_LABELS[t] ?? t.replace(/-/g, ' ');
