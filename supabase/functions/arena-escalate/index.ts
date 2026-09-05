import { z } from 'npm:zod@^3.24.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@^0.72.0/helpers/zod';
import { anthropic, clamp, CORS, json, MODEL, requireUser } from '../_shared/anthropic.ts';
import { CRISIS_CLAUSE, VOICE } from '../_shared/voice.ts';

/**
 * Writes the next round of a spar, using the user's own answer against them.
 *
 * This is the call that makes the Arena feel like sparring rather than a quiz.
 * The escalation must quote them and then remove whatever made their position
 * comfortable. Generic escalations ("it gets worse") are the failure mode, so
 * the prompt is explicit about grounding it in their specific words.
 *
 * Falls back to the scenario's authored escalation template on any failure,
 * which is the same copy the offline adapter uses. The spar continues either
 * way; only the sharpness changes.
 */

const Escalation = z.object({
  crisis: z.boolean(),
  escalation: z.string(),
});

const SYSTEM = `${VOICE}

You write the next round of a sparring exchange.

You are given the situation so far and exactly what the user said they would
do. Write the escalation: the same situation, one turn worse, constructed so
that the specific position they took is now harder to hold.

Rules:
- Open by quoting their answer back to them, verbatim, in quotation marks,
  introduced with "You said:".
- Then two or three sentences of escalation, second person, present tense.
- Take away whatever made their answer easy. If they said they would walk away,
  make walking away costly. If they said they would raise it later, remove
  later. If they said they would let it go, have it happen again in public.
- Concrete and specific. No abstractions, no lecturing, no hints at the right
  answer, no questions except a short closing challenge if it lands naturally.
- Never tell them whether their answer was good.

${CRISIS_CLAUSE}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const user = await requireUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  let body: { opening?: string; previousResponse?: string; roundIndex?: number; fallback?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const previous = clamp(body.previousResponse, 1200);
  const fallback = clamp(body.fallback, 1200);
  if (!previous) return json({ error: 'no previous response' }, 400);

  const round = body.roundIndex === 2 ? 'third and final' : 'second';

  try {
    const response = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      // Creative but tightly bounded: low effort is the right trade here.
      output_config: { effort: 'low', format: zodOutputFormat(Escalation) },
      messages: [
        {
          role: 'user',
          content: `This is the ${round} round.\n\nSITUATION SO FAR\n${clamp(body.opening, 1500)}\n\nTHEY SAID\n${previous}`,
        },
      ],
    });

    const parsed = response.parsed_output;
    if (!parsed) return json({ crisis: false, escalation: fallback });
    if (parsed.crisis) return json({ crisis: true });

    return json({ crisis: false, escalation: parsed.escalation || fallback });
  } catch (error) {
    console.error('arena-escalate failed', error);
    return json({ crisis: false, escalation: fallback });
  }
});
