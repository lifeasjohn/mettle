import { z } from 'npm:zod@^3.24.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@^0.72.0/helpers/zod';
import { anthropic, clamp, CORS, json, MODEL, requireUser } from '../_shared/anthropic.ts';
import { CRISIS_CLAUSE, VOICE } from '../_shared/voice.ts';

/**
 * Scores a completed three-round spar.
 *
 * Scored once over the whole exchange rather than per round, because what the
 * format exists to measure is whether the user held their line as the pressure
 * compounded. A strong first answer that collapses by round three is not a
 * strong performance and must not score like one.
 *
 * The response shape is enforced by structured outputs, so the "validate and
 * retry on malformed JSON" dance the original spec called for is unnecessary:
 * the model cannot return a shape that does not match the schema. What can
 * still happen is a refusal or a transport failure, and those fall back to a
 * templated Bending verdict rather than showing the user an error.
 */

const Verdict = z.object({
  crisis: z.boolean(),
  verdict: z.enum(['tempered', 'bending', 'brittle']),
  strength: z.string(),
  miss: z.string(),
});

const RUBRIC = `${VOICE}

You are scoring a three-round sparring exchange. In each round the user was
given a provoking situation and wrote what they judged the trained response to
be. Rounds two and three escalated using their own previous answer.

Score ONLY against the target concepts you are given. Do not score writing
quality, length, politeness, or whether you personally agree with their choice.

Verdicts:
- "tempered": they applied the target concepts and held that line through the
  final round, including a decision about what they would actually do.
- "bending": they reached for the right idea but it slipped, or it held early
  and gave way under escalation, or they named it without acting on it.
- "brittle": the response is governed by the provocation. Blame located outside
  themselves, absolutist framing, or a plan that is really retaliation.

Weight the final round most heavily. Holding under pressure is the whole test.

Then write exactly two sentences:
- "strength": one sentence on what was genuinely Stoic in what they wrote.
  Specific to their words. Never invent a strength that is not there; if the
  answer was poor, the honest strength is that they engaged with it.
- "miss": one sentence on the judgment that ran them, or what they stopped
  short of. Correct, do not scold, and never soften it into a compliment.

Both sentences together must be under 50 words. Address them as "you".

${CRISIS_CLAUSE}`;

const FALLBACK = {
  crisis: false,
  verdict: 'bending' as const,
  strength: 'You stayed in it and answered rather than deflecting.',
  miss: 'Hard to judge how far you took it from what came through.',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const user = await requireUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  let body: {
    opening?: string;
    targetConcepts?: { id?: string; name?: string; summary?: string; cues?: string[] }[];
    rounds?: { prompt?: string; response?: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const rounds = (body.rounds ?? []).slice(0, 3).map((r) => ({
    prompt: clamp(r.prompt, 1200),
    response: clamp(r.response, 1200),
  }));
  if (rounds.length === 0) return json({ error: 'no rounds' }, 400);

  const concepts = (body.targetConcepts ?? []).slice(0, 2).map((c) => ({
    name: clamp(c.name, 120),
    summary: clamp(c.summary, 400),
    cues: (c.cues ?? []).slice(0, 12).map((cue) => clamp(cue, 60)),
  }));

  const transcript = rounds
    .map((r, i) => `ROUND ${i + 1}\nSituation: ${r.prompt}\nThey wrote: ${r.response}`)
    .join('\n\n');

  const target = concepts
    .map((c) => `- ${c.name}: ${c.summary}\n  Applied language looks like: ${c.cues.join(', ')}`)
    .join('\n');

  try {
    const response = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      // The rubric is byte-identical on every request, so it caches and the
      // per-call input cost collapses to the transcript alone.
      system: [{ type: 'text', text: RUBRIC, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'medium', format: zodOutputFormat(Verdict) },
      messages: [
        {
          role: 'user',
          content: `TARGET CONCEPTS\n${target}\n\nOPENING SITUATION\n${clamp(body.opening, 1200)}\n\nTRANSCRIPT\n${transcript}`,
        },
      ],
    });

    const parsed = response.parsed_output;
    if (!parsed) return json(FALLBACK);
    if (parsed.crisis) return json({ crisis: true });

    return json({
      crisis: false,
      verdict: parsed.verdict,
      strength: parsed.strength,
      miss: parsed.miss,
    });
  } catch (error) {
    // A verdict screen with a graceful default beats an error dialog at the end
    // of a three-round exchange the user just spent three minutes on.
    console.error('arena-score failed', error);
    return json(FALLBACK);
  }
});
