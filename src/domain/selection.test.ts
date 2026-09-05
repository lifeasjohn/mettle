import { describe, expect, it } from 'vitest';
import { scenariosByPath } from '../content';
import { buildEscalation, selectScenario } from './spar-select';

const flat = { wisdom: 0, courage: 0, temperance: 0, justice: 0 };

describe('scenario selection', () => {
  it('serves an unseen seed scenario first', () => {
    const result = selectScenario({
      path: 'anger',
      seenScenarioIds: new Set(),
      radar: flat,
      seed: 'a',
    });
    expect(result.source).toBe('seed');
    expect(result.scenario.path).toBe('anger');
  });

  it('never repeats a scenario the user has already sparred', () => {
    const seen = new Set(scenariosByPath['anxiety'].map((s) => s.id));
    const result = selectScenario({
      path: 'anxiety',
      seenScenarioIds: seen,
      radar: flat,
      seed: 'a',
    });
    expect(result.source).toBe('template');
    expect(seen.has(result.scenario.id)).toBe(false);
  });

  it('biases toward the virtue with the least evidence behind it', () => {
    const result = selectScenario({
      path: 'anger',
      seenScenarioIds: new Set(),
      radar: { wisdom: 20, courage: 20, temperance: 20, justice: 0 },
      seed: 'a',
    });
    expect(result.scenario.virtue).toBe('justice');
  });

  it('composes deterministically, so a given seed always yields the same scenario', () => {
    const seen = new Set(scenariosByPath['discipline'].map((s) => s.id));
    const args = { path: 'discipline' as const, seenScenarioIds: seen, radar: flat, seed: 'fixed' };
    expect(selectScenario(args).scenario.opening).toBe(selectScenario(args).scenario.opening);
  });

  it('leaves no unfilled slots when composing', () => {
    const seen = new Set(scenariosByPath['distraction'].map((s) => s.id));
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const { scenario } = selectScenario({
        path: 'distraction',
        seenScenarioIds: seen,
        radar: flat,
        seed,
      });
      expect(scenario.opening).not.toMatch(/{{|}}/);
    }
  });
});

describe('escalation', () => {
  it('quotes the user back at themselves, which is the whole point', () => {
    const built = buildEscalation('You said: "{{answer}}"\n\nHe does it again.', 'I let it go.');
    expect(built).toContain('I let it go.');
    expect(built).not.toContain('{{answer}}');
  });

  it('truncates a long answer so the escalation card stays readable', () => {
    const built = buildEscalation('{{answer}}', 'x'.repeat(500));
    expect(built.length).toBeLessThan(230);
    expect(built.endsWith('...')).toBe(true);
  });
});
