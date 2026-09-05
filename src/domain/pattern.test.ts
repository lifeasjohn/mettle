import { describe, expect, it } from 'vitest';
import { analysePatterns } from './pattern';
import { quench, spar } from './test-support';

const TODAY = '2026-03-20';
const daysAgo = (n: number) => {
  const d = new Date(2026, 2, 20);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('The Pattern', () => {
  it('says nothing until it has enough evenings to say it honestly', () => {
    const report = analysePatterns([quench(TODAY), quench(daysAgo(1))], [], TODAY);
    expect(report.hasEnoughData).toBe(false);
    expect(report.entriesNeeded).toBe(3);
    expect(report.insights).toEqual([]);
  });

  it('names the dominant trigger once it recurs', () => {
    const entries = [0, 1, 2, 3, 4].map((n) =>
      quench(daysAgo(n), { ranChipIds: ['ran-personally'] }),
    );
    const report = analysePatterns(entries, [], TODAY);

    const trigger = report.insights.find((i) => i.kind === 'trigger');
    expect(trigger?.headline).toContain('taking something personally');
    expect(trigger?.headline).toContain('5');
  });

  it('does not let one bad evening manufacture a pattern', () => {
    // Several chips sharing a trigger on a single day must count once.
    const entries = [
      quench(TODAY, { ranChipIds: ['ran-reacted', 'ran-snapped'] }),
      ...[1, 2, 3, 4].map((n) => quench(daysAgo(n))),
    ];
    const report = analysePatterns(entries, [], TODAY);
    expect(report.insights.find((i) => i.kind === 'trigger')).toBeUndefined();
  });

  it('locates a trigger in a setting when it concentrates there', () => {
    const entries = [
      ...[0, 1, 2, 3].map((n) =>
        quench(daysAgo(n), { ranChipIds: ['ran-personally'], setting: 'work' }),
      ),
      quench(daysAgo(4), { ranChipIds: ['ran-personally'], setting: 'home' }),
    ];
    const report = analysePatterns(entries, [], TODAY);

    const setting = report.insights.find((i) => i.kind === 'setting');
    expect(setting?.headline).toContain('at work');
    expect(setting?.detail).toContain('4 of the 5');
  });

  it('reports no setting when it is genuinely spread out', () => {
    const entries = [
      quench(daysAgo(0), { ranChipIds: ['ran-personally'], setting: 'work' }),
      quench(daysAgo(1), { ranChipIds: ['ran-personally'], setting: 'home' }),
      quench(daysAgo(2), { ranChipIds: ['ran-personally'], setting: 'out' }),
      quench(daysAgo(3), { ranChipIds: ['ran-personally'], setting: 'online' }),
      quench(daysAgo(4)),
    ];
    const report = analysePatterns(entries, [], TODAY);
    expect(report.insights.find((i) => i.kind === 'setting')).toBeUndefined();
  });

  it('reports what holds, not only what fails', () => {
    const entries = [0, 1, 2, 3, 4].map((n) => quench(daysAgo(n), { heldChipIds: ['held-paused'] }));
    const report = analysePatterns(entries, [], TODAY);

    const held = report.insights.find((i) => i.kind === 'held');
    expect(held?.headline).toContain('pausing before reacting');
  });

  it('surfaces the concept the Arena keeps catching', () => {
    const entries = [0, 1, 2, 3, 4].map((n) => quench(daysAgo(n)));
    const spars = [
      spar(daysAgo(0), 'brittle', 'temperance', ['not-taking-offense']),
      spar(daysAgo(1), 'bending', 'temperance', ['not-taking-offense']),
      spar(daysAgo(2), 'tempered', 'wisdom', ['event-vs-judgment']),
    ];
    const report = analysePatterns(entries, spars, TODAY);

    const arena = report.insights.find((i) => i.kind === 'arena');
    expect(arena?.headline).toContain('Offense Requires Your Signature');
  });

  it('never claims an outcome it cannot measure', () => {
    const entries = [0, 1, 2, 3, 4, 5].map((n) =>
      quench(daysAgo(n), { ranChipIds: ['ran-personally'], heldChipIds: ['held-calm'] }),
    );
    const report = analysePatterns(entries, [], TODAY);

    const text = report.insights.map((i) => `${i.headline} ${i.detail}`).join(' ').toLowerCase();
    // Self-report is evidence of a report, not of an outcome. No improvement
    // claims, no percentages, no "your anxiety is down".
    expect(text).not.toMatch(/\bdown\s+\d|\bimproved|\bbetter\b|%|\breduc/);
    expect(text).toContain('you reported');
  });

  it('drops evidence older than the window', () => {
    const entries = [0, 1, 2, 3, 4].map((n) =>
      quench(daysAgo(n + 60), { ranChipIds: ['ran-personally'] }),
    );
    expect(analysePatterns(entries, [], TODAY).hasEnoughData).toBe(false);
  });
});
