# Arena edge functions

Deno, deployed to Supabase. They are excluded from the app's `tsconfig.json`
because they target a different runtime; `deno check` is their typecheck.

| Function | What it does |
|---|---|
| `arena-escalate` | Writes round 2 and 3 using the user's own previous answer against them. |
| `arena-score` | Scores the whole three-round exchange, and carries crisis layer 2. |
| `arena-generate` | Writes a fresh scenario once the authored pool is exhausted. |

## Secrets

```
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set ARENA_MODEL=claude-opus-5      # optional
supabase secrets set ALLOWED_ORIGIN=https://your.app # optional, defaults to *
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected by the platform.

## Deploy

```
supabase db push
supabase functions deploy arena-escalate arena-score arena-generate
```

## Notes

- Every function requires a signed-in caller. These spend money per request, so
  an unauthenticated endpoint is a billing hole as much as a data one.
- The system prompts are byte-stable and marked `cache_control: ephemeral`, so
  the rubric caches and per-call input cost collapses to the transcript.
- Response shapes are enforced by structured outputs, so malformed JSON is not
  a failure mode. Refusals and transport errors are, and each function falls
  back to something usable rather than surfacing an error mid-spar.
- `ARENA_MODEL` tunes the economics without a code change. The default is
  `claude-opus-5`; `claude-sonnet-5` and `claude-haiku-4-5` cost less per call.
