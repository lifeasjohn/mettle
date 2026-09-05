import { describe, expect, it } from 'vitest';
import { scoreHeuristically } from './scoring-heuristic';

const score = (responses: string[], targets = ['dichotomy-of-control']) =>
  scoreHeuristically({ responses, targetConcepts: targets });

describe('offline scorer', () => {
  it('tempers a response that uses the concept and holds it under escalation', () => {
    const result = score([
      'What he said is not mine to control. My part is how I respond, and I can do that after the meeting rather than in it.',
      'Still not mine. I will raise the attribution in writing, calmly, because that is the bit that is up to me.',
      'Same answer. It is not in my power what he does; my part is the record, and I will handle it without heat.',
    ]);
    expect(result.verdict).toBe('tempered');
  });

  it('marks externalising as brittle even when it is articulate', () => {
    const result = score([
      'He made me look stupid in front of everyone and it is his fault entirely.',
      'He made me react like that. I had no choice.',
      'It is not my fault, he always does this.',
    ]);
    expect(result.verdict).toBe('brittle');
    expect(result.miss).toContain('hands them the controls');
  });

  it('catches absolutist framing dressed up as fact', () => {
    const result = score(['He always does this and nobody ever says anything about it.']);
    expect(result.miss).toContain('Always and never');
  });

  it('does not reward a short shrug, however clean the language', () => {
    expect(score(['Not mine.']).verdict).not.toBe('tempered');
  });

  it('penalises collapsing under escalation', () => {
    const held = score([
      'That is not mine to control, my part is the response.',
      'Still my part only. I can choose what I do next.',
      'It is not mine. I will decide what I do and leave the rest.',
    ]);
    const collapsed = score([
      'That is not mine to control, my part is the response.',
      'Actually he made me feel small and it is his fault.',
      'He always does this to everyone.',
    ]);
    expect(held.verdict).toBe('tempered');
    expect(collapsed.verdict).toBe('brittle');
  });

  it('always returns a strength line, so no verdict is purely punitive', () => {
    for (const responses of [[''], ['whatever'], ['He made me do it']]) {
      const r = score(responses);
      expect(r.strength.length).toBeGreaterThan(0);
      expect(r.miss.length).toBeGreaterThan(0);
    }
  });
});
