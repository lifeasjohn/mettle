/**
 * Layer 1 of the crisis guardrail.
 *
 * Runs client-side on every piece of user free text BEFORE it reaches any
 * scoring path, local or remote. Layer 2 lives in the scoring prompt, which can
 * set `"crisis": true` using context this screen cannot see. Either layer
 * firing drops the game frame entirely: no verdict is shown, none is stored,
 * and the user gets support resources instead.
 *
 * Tuning note, deliberate and worth understanding before editing:
 *
 * This is an anger-training app. "I wanted to kill him" is ordinary hyperbole
 * here and will arrive constantly. Flagging it would make the product unusable
 * and would train users to write blandly, which defeats the point. So layer 1
 * is tuned tight around **self-harm and abuse disclosure**, where idiomatic
 * overlap is low and the cost of a miss is highest. Third-party harm is caught
 * only on narrow, high-signal phrasing (a stated plan or a concrete method) and
 * is otherwise left to layer 2, which can read the surrounding context.
 *
 * False positives here are cheap: the user sees a support screen and can carry
 * on. False negatives are not. When in doubt, widen.
 */

export type CrisisCategory = 'self-harm' | 'abuse' | 'harm-to-others';

export interface CrisisResult {
  crisis: boolean;
  category?: CrisisCategory;
  /** The phrase that fired, for logging. Never shown to the user. */
  matched?: string;
}

const SAFE: CrisisResult = { crisis: false };

/**
 * Figures of speech that contain crisis-adjacent stems. Stripped before
 * matching so "this deadline is killing me" and "I'm dying to know" do not fire.
 */
const IDIOMS: RegExp[] = [
  /\b(?:is|was|are|were|been)\s+killing\s+me\b/gi,
  /\bkill(?:s|ed|ing)?\s+(?:time|the\s+\w+|it|this|that|the\s+mood|my\s+(?:buzz|vibe))\b/gi,
  /\bdying\s+(?:to|of|for)\b/gi,
  /\bdie\s+of\s+(?:embarrassment|boredom|shame|laughter)\b/gi,
  /\bto\s+die\s+for\b/gi,
  /\bdead\s+(?:tired|serious|right|wrong|end|line|weight)\b/gi,
  /\bdrop\s+dead\b/gi,
  /\bkill\s+myself\s+laughing\b/gi,
  /\bcould\s+(?:have\s+)?killed\s+(?:him|her|them)\b/gi,
];

interface Pattern {
  re: RegExp;
  category: CrisisCategory;
}

const PATTERNS: Pattern[] = [
  // --- self-harm: highest priority, lowest idiomatic overlap ---------------
  { re: /\bkill(?:ing)?\s+my\s?self\b/i, category: 'self-harm' },
  { re: /\bsuicid(?:e|al)\b/i, category: 'self-harm' },
  { re: /\btake\s+my\s+own\s+life\b/i, category: 'self-harm' },
  { re: /\bend(?:ing)?\s+(?:my\s+life|it\s+all)\b/i, category: 'self-harm' },
  { re: /\b(?:want|wanted|wish|wished)\s+(?:i\s+(?:was|were)\s+dead|to\s+die)\b/i, category: 'self-harm' },
  { re: /\bbetter\s+off\s+(?:dead|without\s+me)\b/i, category: 'self-harm' },
  { re: /\bno\s+(?:reason|point)\s+(?:to|in)\s+(?:liv|go)/i, category: 'self-harm' },
  { re: /\bdon'?t\s+want\s+to\s+(?:be\s+here|wake\s+up|exist)\b/i, category: 'self-harm' },
  { re: /\bself[-\s]?harm/i, category: 'self-harm' },
  { re: /\b(?:cut|cutting|burn|burning|starv\w*)\s+my\s?self\b/i, category: 'self-harm' },
  { re: /\bhurt(?:ing)?\s+my\s?self\b/i, category: 'self-harm' },
  { re: /\boverdos(?:e|ed|ing)\b/i, category: 'self-harm' },

  // --- abuse disclosure ----------------------------------------------------
  {
    re: /\b(?:he|she|they|my\s+(?:husband|wife|partner|boyfriend|girlfriend|dad|father|mum|mom|mother|ex|brother|son))\s+(?:hit|hits|hit\s+me|beats?|beat|punch\w*|chok\w*|strangl\w*|threw|throws|shoves?|shoved|slaps?|slapped)\s+me\b/i,
    category: 'abuse',
  },
  { re: /\b(?:hits|beats|punches|chokes|strangles)\s+me\b/i, category: 'abuse' },
  { re: /\bafraid\s+(?:to\s+go\s+home|for\s+my\s+(?:safety|life)|he'?ll\s+hurt|she'?ll\s+hurt)\b/i, category: 'abuse' },
  { re: /\bnot\s+safe\s+(?:at\s+home|with\s+(?:him|her|them))\b/i, category: 'abuse' },
  { re: /\b(?:physically|sexually)\s+abus(?:ed|ive|ing)\b/i, category: 'abuse' },
  { re: /\bassault(?:ed|ing)\s+me\b/i, category: 'abuse' },

  // --- harm to others: narrow by design; layer 2 carries the rest ----------
  { re: /\b(?:going\s+to|gonna|about\s+to|planning\s+to)\s+(?:kill|stab|shoot|hurt\s+\w+\s+badly)\b/i, category: 'harm-to-others' },
  { re: /\bi\s+(?:have|bought|got)\s+a\s+(?:gun|knife|weapon)\b.{0,60}\b(?:him|her|them|kill|hurt)\b/i, category: 'harm-to-others' },
  { re: /\bmake\s+(?:him|her|them)\s+pay\b.{0,40}\b(?:blood|hurt|dead|kill)\b/i, category: 'harm-to-others' },
];

/**
 * Screens a single piece of free text. Returns on the first match, ordered so
 * self-harm wins over other categories when text matches more than one.
 */
export function screenForCrisis(text: string): CrisisResult {
  if (!text) return SAFE;

  // Strip idioms first so their crisis-adjacent stems cannot fire a pattern.
  let scrubbed = text;
  for (const idiom of IDIOMS) scrubbed = scrubbed.replace(idiom, ' ');

  // Collapse punctuation used to evade matching ("k.i.l.l m.y.s.e.l.f") and
  // normalise whitespace so multi-word patterns survive line breaks.
  const normalised = scrubbed
    .replace(/[._*\-]{1,2}(?=\w)/g, '')
    .replace(/\s+/g, ' ');

  for (const { re, category } of PATTERNS) {
    const m = normalised.match(re);
    if (m) return { crisis: true, category, matched: m[0] };
  }

  return SAFE;
}

/** Screens several rounds at once. Any round firing condemns the whole spar. */
export function screenAll(texts: readonly string[]): CrisisResult {
  for (const t of texts) {
    const result = screenForCrisis(t);
    if (result.crisis) return result;
  }
  return SAFE;
}
