import { screenAll } from '../domain/crisis';
import type { ScoreRequest, SparScoreResult } from './types';

/**
 * Shared crisis gate.
 *
 * Both adapters route scoring through this, so there is exactly one code path
 * to audit and no way for an adapter to score text that has not been screened.
 * Layer 2 (the model setting `"crisis": true`) sits inside the remote scorer and
 * is folded into the same result shape.
 */
export async function scoreWithGuardrail(
  request: ScoreRequest,
  score: (request: ScoreRequest) => Promise<SparScoreResult>,
): Promise<SparScoreResult> {
  const screened = screenAll(request.responses);
  if (screened.crisis) {
    return { crisis: true, category: screened.category ?? 'self-harm' };
  }
  return score(request);
}
