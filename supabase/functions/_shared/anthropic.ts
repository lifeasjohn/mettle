import Anthropic from 'npm:@anthropic-ai/sdk@^0.72.0';

/**
 * Shared Anthropic client for the Arena functions.
 *
 * Model is configurable so the economics can be tuned without a code change.
 * The default is Claude Opus 5, and the cost is genuinely small here: scoring
 * sends roughly 1.2K input tokens (most of it a cached prefix) and returns
 * about 120, so a full three-round spar costs a few cents. A free user is
 * capped at three spars, which bounds their entire cost.
 *
 * Set ARENA_MODEL to claude-sonnet-5 or claude-haiku-4-5 to trade judgment
 * quality for cost. That is a product decision, not a default worth making
 * silently.
 */
export const MODEL = Deno.env.get('ARENA_MODEL') ?? 'claude-opus-5';

export const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
});

export const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/**
 * Requires a signed-in caller.
 *
 * These functions spend money per request, so an unauthenticated endpoint is a
 * billing hole as much as a data one. The client's user JWT is verified against
 * the project's auth service before any inference happens.
 */
export async function requireUser(req: Request): Promise<{ id: string } | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return null;

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: anon },
  });
  if (!res.ok) return null;

  const user = (await res.json()) as { id?: string };
  return user.id ? { id: user.id } : null;
}

/** Trims and hard-caps user text before it reaches a prompt. */
export function clamp(text: unknown, max: number): string {
  return typeof text === 'string' ? text.trim().slice(0, max) : '';
}
