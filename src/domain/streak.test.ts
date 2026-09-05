import { describe, expect, it } from 'vitest';
import { computeStreak, type DayActivity } from './streak';

const day = (date: string, ...kinds: DayActivity['kinds']): DayActivity => ({ date, kinds });

describe('streak', () => {
  it('is zero with no activity', () => {
    expect(computeStreak([], '2026-03-10')).toMatchObject({ current: 0, longest: 0, aliveToday: false });
  });

  it('counts a day for ANY single activity, not all three', () => {
    // Practice-based, never outcome-based: one thing is enough.
    expect(computeStreak([day('2026-03-10', 'quench')], '2026-03-10').current).toBe(1);
    expect(computeStreak([day('2026-03-10', 'spar')], '2026-03-10').current).toBe(1);
    expect(computeStreak([day('2026-03-10', 'lesson')], '2026-03-10').current).toBe(1);
  });

  it('counts consecutive days', () => {
    const days = ['2026-03-08', '2026-03-09', '2026-03-10'].map((d) => day(d, 'quench'));
    expect(computeStreak(days, '2026-03-10').current).toBe(3);
  });

  it('stays alive on a day not yet trained, if yesterday counted', () => {
    const days = [day('2026-03-08', 'quench'), day('2026-03-09', 'quench')];
    const s = computeStreak(days, '2026-03-10');
    expect(s).toMatchObject({ current: 2, aliveToday: false, atRisk: true });
  });

  it('breaks after a full missed day, with no freezes', () => {
    const days = [day('2026-03-01', 'quench'), day('2026-03-02', 'quench')];
    expect(computeStreak(days, '2026-03-10')).toMatchObject({ current: 0, atRisk: false });
  });

  it('remembers the longest run even after it breaks', () => {
    const days = [
      ...['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04'].map((d) => day(d, 'lesson')),
      day('2026-03-10', 'quench'),
    ];
    expect(computeStreak(days, '2026-03-10')).toMatchObject({ current: 1, longest: 4 });
  });

  it('does not double-count several activities on one day', () => {
    const days = [day('2026-03-10', 'lesson', 'spar', 'quench')];
    expect(computeStreak(days, '2026-03-10').current).toBe(1);
  });

  it('ignores days recorded with no activity at all', () => {
    expect(computeStreak([day('2026-03-10')], '2026-03-10').current).toBe(0);
  });
});
