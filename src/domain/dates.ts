import type { ISODate } from './types';

/**
 * Streaks are counted in device-local calendar days, deliberately. A user in
 * Auckland finishing a lesson at 11pm should get credit for that day, and UTC
 * would silently rob them of it.
 */

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Whole days from `a` to `b`. Negative when `b` is earlier. */
export function daysBetween(a: ISODate, b: ISODate): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** 0 = Sunday, matching Date#getDay. */
export function dayOfWeek(iso: ISODate): number {
  return parseISODate(iso).getDay();
}

export const weekdayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Inclusive of both ends. Used for the rolling windows The Pattern reports over. */
export function withinDays(iso: ISODate, today: ISODate, window: number): boolean {
  const delta = daysBetween(iso, today);
  return delta >= 0 && delta < window;
}
