import { z } from 'npm:zod@^3.24.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@^0.72.0/helpers/zod';
import { anthropic, clamp, CORS, json, MODEL, requireUser } from '../_shared/anthropic.ts';
import { VOICE } from '../_shared/voice.ts';

/**
 * Generates a fresh scenario when a user has exhausted the authored pool.
 *
 * This is tier 3 of scenario supply. Tiers 1 and 2 (40 hand-written scenarios
 * and ~547 template combinations) cover a long time before this is reached,
 * which is deliberate: generation is the expensive path and the lowest-quality
 * one, so it should be rare.
 *
 * Generated scenarios are persisted to arena_scenarios and shared across users,
 * so the pool compounds: one user's generation becomes supply for everyone on
 * that struggle path.
 */

const Generated = z.object({
  opening: z.string(),
  instinctOptions: z.array(z.string()),
  escalationTwo: z.string(),
  escalationThree: z.string(),
  referenceAnswer: z.string(),
});

const SYSTEM = `${VOICE}

You write sparring scenarios for the Arena.

A scenario is a short, concrete, second-person situation that provokes a
specific failure of judgment. It must feel like an ordinary Tuesday, not a
dramatic set piece. Specific details beat general ones: a named time, a real
object, an exact sentence someone says.

Return:
- "opening": two or three sentences. Second person, present tense. It should
  land before the reader has decided anything. No question at the end.
- "instinctOptions": exactly four short gut reactions, three to six words each.
  At least two should be tempting rather than obviously wrong.
- "escalationTwo" and "escalationThree": escalation templates for rounds two and
  three. Each MUST contain the literal token {{answer}} where the user's own
  previous response will be inserted, and should read naturally around it, for
  example: You said: "{{answer}}" and then the situation gets worse.
- "referenceAnswer": three or four sentences in first person, showing what
  applying the target concepts to this situation actually looks like. This is
  the model answer the user is shown after their verdict. It must be usable,
  not aspirational.

Never mention Stoicism, philosophers, or the concept names in the opening or
the escalations. The scenario is a situation, not a lesson.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const user = await requireUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  let body: {
    path?: string;
    virtue?: string;
    targetConcepts?: { id?: string; name?: string; summary?: string }[];
    avoidOpenings?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const path = clamp(body.path, 40) || 'anxiety';
  const virtue = clamp(body.virtue, 40) || 'wisdom';
  const concepts = (body.targetConcepts ?? []).slice(0, 2);
  if (concepts.length === 0) return json({ error: 'no target concepts' }, 400);

  const target = concepts
    .map((c) => `- ${clamp(c.name, 120)}: ${clamp(c.summary, 400)}`)
    .join('\n');

  // Recent openings are listed so the model does not regenerate near-duplicates
  // of what this user has already sparred.
  const avoid = (body.avoidOpenings ?? [])
    .slice(0, 8)
    .map((o) => `- ${clamp(o, 200)}`)
    .join('\n');

  try {
    const response = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'medium', format: zodOutputFormat(Generated) },
      messages: [
        {
          role: 'user',
          content: `Struggle path: ${path}\nVirtue under test: ${virtue}\n\nTARGET CONCEPTS\n${target}\n\nDO NOT write anything close to these, which they have already faced:\n${avoid || '- (none yet)'}`,
        },
      ],
    });

    const parsed = response.parsed_output;
    if (!parsed) return json({ error: 'generation failed' }, 502);

    // A generated escalation without the token cannot compound, which is the
    // whole point of the format, so reject rather than persist a broken one.
    if (!parsed.escalationTwo.includes('{{answer}}') || !parsed.escalationThree.includes('{{answer}}')) {
      return json({ error: 'generation failed' }, 502);
    }

    return json({
      id: `gen-${crypto.randomUUID()}`,
      path,
      virtue,
      targetConcepts: concepts.map((c) => clamp(c.id, 80)).filter(Boolean),
      opening: parsed.opening,
      instinctOptions: parsed.instinctOptions.slice(0, 4),
      escalations: [{ template: parsed.escalationTwo }, { template: parsed.escalationThree }],
      referenceAnswer: parsed.referenceAnswer,
      source: 'generated',
    });
  } catch (error) {
    console.error('arena-generate failed', error);
    return json({ error: 'generation failed' }, 502);
  }
});
