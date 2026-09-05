import { conceptById } from '../content';
import type { Verdict } from './types';

/**
 * Offline scorer.
 *
 * This exists so the Arena is fully playable with no backend and no API key,
 * which means the product can be demoed and developed end to end today. The
 * Supabase adapter swaps it for the arena-score edge function behind the same
 * interface; the UI cannot tell the difference.
 *
 * It is a heuristic and it is honest about that. It looks for evidence that the
 * user applied the concepts the scenario targets, and for the two failure modes
 * that are actually detectable in text: externalising blame, and absolutist
 * framing. It cannot judge nuance, which is exactly what the model is for.
 */

export interface HeuristicInput {
  /** One response per round, in order. */
  responses: readonly string[];
  targetConcepts: readonly string[];
}

export interface HeuristicVerdict {
  verdict: Verdict;
  strength: string;
  miss: string;
}

/** Handing responsibility for one's own state to someone else. */
const EXTERNALISING = [
  /\b(?:he|she|they|it|you)\s+(?:made|makes|make)\s+me\b/i,
  /\bhad\s+no\s+choice\b/i,
  /\bforced\s+me\b/i,
  /\bmade\s+me\s+feel\b/i,
  /\b(?:his|her|their)\s+fault\b/i,
  /\bnot\s+my\s+fault\b/i,
  /\bshould\s+(?:have\s+)?(?:known|apologis|realis)/i,
];

const ABSOLUTIST = [
  /\balways\b/i,
  /\bnever\b/i,
  /\bevery\s+(?:time|single)\b/i,
  /\beveryone\b/i,
  /\bnobody\b/i,
  /\bno\s+one\s+ever\b/i,
];

/** First-person agency: the user locating the move inside themselves. */
const OWNERSHIP = [
  /\bi\s+(?:can|will|chose|choose|decided|decide|noticed|added|made\s+it\s+mean)\b/i,
  /\b(?:that\s+is|that's|it\s+is|it's)\s+mine\b/i,
  /\bmy\s+(?:part|judgment|judgement|call|move|response|reading)\b/i,
  /\bnot\s+mine\b/i,
  /\bup\s+to\s+me\b/i,
];

const countMatches = (text: string, patterns: readonly RegExp[]) =>
  patterns.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);

function conceptCoverage(text: string, targetConcepts: readonly string[]): number {
  if (targetConcepts.length === 0) return 0;
  const lower = text.toLowerCase();
  let hit = 0;
  for (const id of targetConcepts) {
    const cues = conceptById.get(id)?.cues ?? [];
    if (cues.some((cue) => lower.includes(cue.toLowerCase()))) hit += 1;
  }
  return hit / targetConcepts.length;
}

export function scoreHeuristically(input: HeuristicInput): HeuristicVerdict {
  const responses = input.responses.filter((r) => r.trim().length > 0);
  const joined = responses.join('\n');
  const words = joined.split(/\s+/).filter(Boolean).length;

  const coverage = conceptCoverage(joined, input.targetConcepts);
  const ownership = countMatches(joined, OWNERSHIP);
  const externalising = countMatches(joined, EXTERNALISING);
  const absolutism = countMatches(joined, ABSOLUTIST);

  // Holding the line under escalation is the thing the three-round format
  // exists to measure, so the final round counts for more than the first.
  const lastRound = responses[responses.length - 1] ?? '';
  const heldUnderPressure =
    responses.length >= 2 && conceptCoverage(lastRound, input.targetConcepts) > 0;

  // A one-line shrug should not score well however clean its language is.
  const substance = Math.min(1, words / 45);

  let score = 0;
  score += coverage * 0.4;
  score += Math.min(1, ownership / 2) * 0.25;
  score += substance * 0.15;
  score += heldUnderPressure ? 0.2 : 0;
  score -= Math.min(1, externalising / 2) * 0.3;
  score -= Math.min(1, absolutism / 2) * 0.15;

  const verdict: Verdict = score >= 0.62 ? 'tempered' : score >= 0.32 ? 'bending' : 'brittle';

  return { verdict, strength: strengthLine(verdict, { coverage, ownership, heldUnderPressure }), miss: missLine({ coverage, externalising, absolutism, substance }) };
}

function strengthLine(
  verdict: Verdict,
  s: { coverage: number; ownership: number; heldUnderPressure: boolean },
): string {
  if (s.heldUnderPressure && verdict === 'tempered') {
    return 'You held the same line in the third round that you set in the first.';
  }
  if (s.ownership >= 1) return 'You put the move inside yourself rather than in what they did.';
  if (s.coverage > 0) return 'You reached for the right distinction, even if it did not fully land.';
  return 'You stayed in it and answered rather than deflecting.';
}

function missLine(s: {
  coverage: number;
  externalising: number;
  absolutism: number;
  substance: number;
}): string {
  if (s.externalising >= 1) return 'The response still hands them the controls: they act, you are acted upon.';
  if (s.absolutism >= 1) return 'Always and never are judgments wearing the clothes of facts.';
  if (s.coverage === 0) return 'The concept this scenario was testing never quite got used.';
  if (s.substance < 0.4) return 'Too short to know whether you worked it or just agreed with it.';
  return 'You named the right thing but stopped before deciding what you would actually do.';
}
