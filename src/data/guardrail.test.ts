import { describe, expect, it, vi } from 'vitest';
import { scenarioById } from '../content';
import { scoreWithGuardrail } from './guardrail';
import type { ScoreRequest } from './types';

const scenario = scenarioById.get('anger-01')!;
const request = (responses: string[]): ScoreRequest => ({ scenario, responses });

describe('crisis gate', () => {
  it('never reaches the scorer when any round trips the screen', async () => {
    const scorer = vi.fn();
    const result = await scoreWithGuardrail(
      request(['I let it go', 'I paused', 'honestly I want to kill myself']),
      scorer,
    );

    // The scorer must not run: that is what stops the text being sent to an
    // inference provider and what stops a verdict ever existing to be stored.
    expect(scorer).not.toHaveBeenCalled();
    expect(result).toMatchObject({ crisis: true, category: 'self-harm' });
  });

  it('makes a verdict unreachable on a crisis result, by construction', async () => {
    const result = await scoreWithGuardrail(request(['I want to die']), async () => {
      throw new Error('should not be called');
    });

    // The union has no verdict member when crisis is true, so the verdict screen
    // cannot be rendered for this result even by mistake.
    expect(result.crisis).toBe(true);
    if (!result.crisis) throw new Error('unreachable');
    expect('verdict' in result).toBe(false);
  });

  it('passes ordinary responses through to the scorer untouched', async () => {
    const scorer = vi.fn(async (_req: ScoreRequest) => ({
      crisis: false as const,
      verdict: 'tempered' as const,
      strength: 's',
      miss: 'm',
    }));
    const responses = ['That is not mine to control.'];

    const result = await scoreWithGuardrail(request(responses), scorer);

    expect(scorer).toHaveBeenCalledOnce();
    expect(scorer.mock.calls[0]![0].responses).toEqual(responses);
    expect(result).toMatchObject({ crisis: false, verdict: 'tempered' });
  });

  it('lets anger hyperbole through, which this app receives constantly', async () => {
    const scorer = vi.fn(async (_req: ScoreRequest) => ({
      crisis: false as const,
      verdict: 'bending' as const,
      strength: 's',
      miss: 'm',
    }));
    await scoreWithGuardrail(request(['I could have killed him, but I paused instead.']), scorer);
    expect(scorer).toHaveBeenCalledOnce();
  });
});
