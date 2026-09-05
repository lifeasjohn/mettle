import { describe, expect, it } from 'vitest';
import { computeRadar, normaliseRadar, radarHasEnoughData, weakestVirtue } from './radar';
import { lessonDone, quench, spar } from './test-support';

const TODAY = '2026-03-10';

describe('virtue radar', () => {
  it('is empty with no input', () => {
    expect(computeRadar({ spars: [], quench: [], lessons: [] }, TODAY)).toEqual({
      wisdom: 0,
      courage: 0,
      temperance: 0,
      justice: 0,
    });
  });

  it('weights verdicts by how much they actually evidence', () => {
    const at = (v: 'tempered' | 'bending' | 'brittle') =>
      computeRadar({ spars: [spar(TODAY, v, 'courage')], quench: [], lessons: [] }, TODAY).courage;

    expect(at('tempered')).toBe(3);
    expect(at('bending')).toBe(1);
    expect(at('brittle')).toBe(0);
  });

  it('credits "held the line" chips but never "a judgment ran me" chips', () => {
    // 'ran' chips are diagnostic. Crediting them would reward self-criticism.
    const held = computeRadar(
      { spars: [], quench: [quench(TODAY, { heldChipIds: ['held-calm'] })], lessons: [] },
      TODAY,
    );
    const ran = computeRadar(
      { spars: [], quench: [quench(TODAY, { ranChipIds: ['ran-personally'] })], lessons: [] },
      TODAY,
    );

    expect(held.temperance).toBe(1);
    expect(ran.temperance).toBe(0);
  });

  it('gives lessons a small credit so day one is not blank', () => {
    const scores = computeRadar(
      { spars: [], quench: [], lessons: [lessonDone(TODAY, 'lesson-1')] },
      TODAY,
    );
    expect(scores.wisdom).toBe(1);
  });

  it('rolls off, so the radar shows current state rather than a lifetime total', () => {
    const old = spar('2026-01-01', 'tempered', 'courage');
    expect(computeRadar({ spars: [old], quench: [], lessons: [] }, TODAY).courage).toBe(0);
  });

  it('never reports mastery it cannot support', () => {
    // Normalising against the strongest axis would always peg one at full.
    const scores = { wisdom: 3, courage: 0, temperance: 0, justice: 0 };
    expect(normaliseRadar(scores).wisdom).toBeLessThan(0.2);
    expect(normaliseRadar({ wisdom: 999, courage: 0, temperance: 0, justice: 0 }).wisdom).toBe(1);
  });

  it('identifies the thinnest virtue, for biasing spar selection', () => {
    expect(weakestVirtue({ wisdom: 5, courage: 1, temperance: 9, justice: 4 })).toBe('courage');
  });

  it('withholds the chart until there is enough evidence', () => {
    expect(radarHasEnoughData({ wisdom: 1, courage: 1, temperance: 0, justice: 0 })).toBe(false);
    expect(radarHasEnoughData({ wisdom: 3, courage: 3, temperance: 0, justice: 0 })).toBe(true);
  });
});
