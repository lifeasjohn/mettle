import { describe, expect, it } from 'vitest';
import {
  chipById,
  conceptById,
  concepts,
  justInTimeConcepts,
  lessons,
  scenarioTemplates,
  scenarios,
  scenariosByPath,
  strugglePaths,
} from './index';

/**
 * Deep cross-file invariants live in scripts/validate-content.ts. These tests
 * cover the loader contract itself: that parsing happens, that the derived
 * indexes are populated, and that the supply guarantees the product depends on
 * actually hold.
 */
describe('content loader', () => {
  it('parses every file without throwing', () => {
    expect(concepts.length).toBeGreaterThan(0);
    expect(lessons.length).toBeGreaterThan(0);
    expect(scenarios.length).toBeGreaterThan(0);
  });

  it('orders lessons contiguously from 1', () => {
    expect(lessons.map((l) => l.order)).toEqual(lessons.map((_, i) => i + 1));
  });

  it('builds lookup indexes covering every record', () => {
    expect(conceptById.size).toBe(concepts.length);
    expect(chipById.size).toBeGreaterThan(0);
    for (const c of concepts) expect(conceptById.get(c.id)).toBe(c);
  });

  it('keeps most concepts out of lessons, for just-in-time delivery', () => {
    // The product deliberately teaches five concepts up front and holds the
    // rest back for the moment of failure. If this inverts, the ramp has crept.
    expect(justInTimeConcepts.length).toBeGreaterThan(lessons.length);
  });

  it('gives every struggle path enough scenarios to outlast the free tier', () => {
    // The free tier grants three spars, each of which consumes one scenario.
    for (const path of strugglePaths) {
      expect(scenariosByPath[path].length).toBeGreaterThan(3);
    }
  });

  it('compounds pressure by quoting the user back in every escalation', () => {
    for (const s of scenarios) {
      expect(s.escalations[0].template).toContain('{{answer}}');
    }
  });

  it('gives every scenario a reference answer, since a grade alone teaches nothing', () => {
    for (const s of [...scenarios, ...scenarioTemplates]) {
      expect(s.referenceAnswer.length).toBeGreaterThan(40);
      expect(s.exemplars.length).toBeGreaterThan(0);
    }
  });
});
