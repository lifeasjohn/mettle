# Mettle: refined plan and build

## Context

Mettle is a daily Stoicism training app: lesson engine, AI scenario sparring, evening review. Two prior planning docs exist (a Cursor spec and a design handoff). The repo was empty; I scaffolded Expo SDK 57 + TypeScript and installed base dependencies before plan mode engaged.

Reviewing those specs surfaced four structural problems, and working through them changed the product shape significantly:

1. **A day-15 cliff.** Unit 1 was 15 lessons and the streak required a lesson or a Quench. From day 16 the only content was a 60-second Quench and 20 scenarios that exhaust in a week. The retention engine ran out before D30.
2. **The differentiated feature was buried.** The Arena is the only thing here competitors do not have, and it sat behind lesson 5, behind a hard paywall, behind 12 onboarding screens.
3. **The Duolingo core loop does not transfer.** Language has correct answers, compounding atoms, and a terminal goal. Stoicism has none of those. Drilling multiple-choice questions produces people who are good at Stoicism quizzes, which is the failure mode of every app in this category. The Duolingo *shell* (streaks, XP, one clear next action) transfers fine; the *drill loop* does not.
4. **The radar measured training volume and called it character.**

Underneath all four sits the central risk: **the app can only measure what happens inside it, but the value happens outside it.** Most decisions below are downstream of that sentence.

Intended outcome: a running, demoable Mettle on `claude/mettle-app-planning-vfb97n` with a loop that sustains past D30, a content pipeline you can write into without touching code, and a Supabase backend that activates the moment you provision a project.

## Product shape (settled)

**The permanent loop is Spar plus Quench.** Lessons are a five-day ramp, not the retention engine. A day counts toward the streak if the user completes any one of a lesson, a spar, or a Quench. Two or more earns bonus XP.

**Five lessons, then just-in-time teaching.** Five tight foundational lessons instead of fifteen. The remaining ten concepts are delivered at the moment of failure: a Brittle or Bending verdict whose miss maps to an unseen concept surfaces that concept card right there. Learning at the point of failure beats learning on a schedule, it cuts authoring by two thirds, and it gets people to the Arena on day one. Unlocked concept cards accumulate into a permanent reference library.

**The Arena unlocks after lesson 1.** Lesson 1 teaches the one distinction, which is enough to score against. Day one is lesson 1 plus a real spar, which is the strongest possible first session and the best possible demo.

**A spar is three compounding rounds.** Round 1 is a seeded scenario. Rounds 2 and 3 escalate using the user's own previous answer against them ("You said you'd let it go. They just said it again, louder, in front of your team."). The verdict lands at the end and includes a **reference answer** showing the rep done right, because a grade with no model to copy teaches nothing. Three inference calls per spar: two escalations, one final scoring pass.

**One anonymous social primitive, nothing more.** After the verdict, show one other user's Tempered response to the same scenario. No profiles, replies, follows, feed, or notifications. It solves the reference-answer problem and gives a training-partner feeling with a tiny moderation surface, since candidates are pre-filtered (already passed the crisis screen, already scored Tempered). The pool starts empty, so it ships seeded with authored exemplar responses and real user responses flow in over time. No leaderboards, no friend streaks, no comments, ever.

**Paywall is spar-metered.** Free tier: all 5 lessons, unlimited Quench, 3 total spars. The paywall fires on the 4th spar attempt. This meters the exact thing that costs inference money and the exact thing the user wants more of, and the ask lands after three real verdicts have proven the product. Cost ceiling per non-payer is 9 inference calls.

**Arena scenario supply, three tiers**, so the pool never runs dry:
1. 40 hand-written seed scenarios (10 per struggle path). Quality floor, offline, zero cost.
2. Template composition: archetypes crossed with variable banks, no LLM call.
3. `arena-generate` edge function once tiers 1 and 2 are exhausted, schema-validated and persisted with `source='generated'` so the shared pool compounds.

Selection picks the highest-tier unseen scenario weighted toward concepts where recent verdicts are weakest, making supply and adaptivity the same mechanism.

**The Pattern replaces Profile/Stats.** Stats are vanity. The Pattern reads Quench chips, timestamps, and Arena verdicts to surface what actually sets the user off and when: "taking things personally, 11 times this month, 9 at work, 7 after 4pm, and Sunday night is always worst." Pure local computation, no AI. It is the retention argument and the one thing no competitor can copy, because it is a dataset about *them*. It degrades gracefully with a "needs more days" state and **never claims an outcome it cannot measure**. No "your anxiety is down 30%."

**The shareable verdict card is designed in, not bolted on.** Scenario, the user's own words, verdict badge, forged aesthetic, one-tap export. Given the audience is Stoic-content TikTok, this is the acquisition channel.

**Naming unified on "The Arena".** "The Anvil" is dropped. Tempering, the Quench, the Seal, and Tempered / Bending / Brittle are kept.

## Navigation

Four tabs, each load-bearing. Five was one too many once Profile became settings behind a header icon.

- **Today**: streak, one dominant CTA, current intention, Quench status.
- **Arena**: the spar flow. Center position, one tap away, because it is the product.
- **Train**: the 5 lessons plus the unlocked concept library. Gives just-in-time cards a permanent home and makes them feel collected.
- **Pattern**: Timeline (the old Journal, chronological Quench and spar history) and Patterns (trigger analysis, virtue radar, streak history) as two views of one surface.

## Architecture

Expo SDK 57, expo-router. Versions pinned from `node_modules/expo/bundledNativeModules.json`.

```
app/
  _layout.tsx               providers, theme, onboarding gate
  (onboarding)/             12 screens, plan reveal now promises the Arena
  (app)/_layout.tsx         4 tabs: Today, Arena, Train, Pattern
  lesson/[id].tsx           card engine (modal)
  arena/index.tsx           3-round spar flow (modal)
  quench/index.tsx          evening review (modal)
  paywall.tsx  settings.tsx
src/
  theme/                    tokens, typography, ThemeProvider
  ui/                       Screen, Button, Card, Chip, ProgressBar, StreakFlame, Radar, ShareCard
  content/
    schema.ts               zod
    lessons/*.json          5 authored lessons, 4 hook variants each
    concepts/*.json         10 just-in-time concept cards
    arena/scenarios.json    40 seeds
    arena/templates.json    archetypes + variable banks
    arena/exemplars.json    authored peer responses seeding the pool
    index.ts                typed loader, parsed once at module init
  domain/                   pure, no react-native imports, unit tested
    streak.ts xp.ts radar.ts pattern.ts unlocks.ts entitlement.ts
    spar-select.ts jit-concepts.ts crisis.ts scoring-heuristic.ts
  data/
    types.ts                Repository interface (the seam)
    local/ supabase/ index.ts
  state/                    zustand stores
supabase/
  migrations/0001_init.sql
  functions/arena-escalate/ arena-score/ arena-generate/
scripts/validate-content.ts
```

**The Repository interface is the critical seam.** `createLocalRepository()` and `createSupabaseRepository()` both satisfy it; `src/data/index.ts` picks based on whether `EXPO_PUBLIC_SUPABASE_URL` is set. This is what lets the app run and be demoed today with no credentials and switch to Supabase with zero refactor.

**The Arena is fully playable without keys.** The local adapter implements escalation from templates and scoring via `domain/scoring-heuristic.ts` (target-concept keyword coverage, absolutist and hedging language detection). The Supabase adapter calls the edge functions. Same interface, same UI, so the whole product is demoable now.

**Crisis guardrail is day one and non-negotiable.** `domain/crisis.ts` is a pure, tested keyword and regex screen running client-side before any scoring path, on **every round** of free text (3x per spar). The edge function prompts carry layer 2 (`"crisis": true`). Either trigger drops the game frame, shows support resources, and stores no verdict.

**Interaction tech, deliberately minimal.** RN's built-in `Animated`, tap-to-advance rather than swipe. Duolingo is tap-driven, it keeps the web preview reliable, and it avoids native config I cannot verify in this container. Reanimated is later polish, not a dependency of the loop.

**Escalation latency is a design problem.** Two generation calls sit mid-flow, so rounds 2 and 3 need a real loading state that reads as pressure building rather than as waiting. Token caps kept tight.

## Build phases

Each phase is one commit on `claude/mettle-app-planning-vfb97n`.

- **A. Foundation.** Router wiring, forged-metal theme, UI primitives, `docs/PLAN.md`, tooling scripts.
- **B. Content.** Schemas, 5 lessons with 4 hook variants each, 10 concept cards, 40 scenarios, templates, exemplar peer responses, validator.
- **C. Domain and local data.** All pure modules with vitest coverage, plus the full AsyncStorage adapter.
- **D. Surfaces.** Onboarding, Today, Train, the lesson card engine (three interaction types, no free text), the 3-round Arena, the Quench, Pattern, paywall, share card.
- **E. Supabase.** Migrations with RLS, generated types, adapter, three edge functions, peer-response fetch.
- **F. Polish.** Evening notification, remote-config flags, analytics event hooks.

## Verification

- `npm run typecheck` (tsc --noEmit) and `npm run test` (vitest over `src/domain` and `src/content`, which import no react-native).
- `npm run validate:content` asserts every lesson has exactly one carry card and four hook variants, every scenario's `target_concepts` resolve against the concept registry, every just-in-time concept has a card, and unlock references resolve.
- `npm run web` serves the Expo web target. Chromium is preinstalled here, so I will drive it with Playwright and send you actual screenshots of each surface as it lands rather than asking you to take my word for it.
- End-to-end path to check by hand: onboarding through struggle-path selection, lesson 1, Arena unlock, a full 3-round spar with verdict, reference answer and peer response, a just-in-time concept card triggered by a Bending verdict, spars 2 and 3, the paywall on spar 4, an evening Quench, and Pattern reflecting all of it.

## Known gaps, named up front

- **No Supabase project exists yet.** Phase E ships migrations, RLS, adapter and edge functions, none verified against a live database until you provision one and supply `EXPO_PUBLIC_SUPABASE_URL` and the anon key.
- **RevenueCat needs an account and a native build.** The paywall ships as a real screen behind an `Entitlement` interface with a stub provider; RevenueCat drops in behind it.
- **Peer responses start as authored exemplars.** Real user responses need volume before the pool is genuinely social. The switchover is a config flag, not a rewrite.
- **Offline mutation queue is deferred.** Local adapter is offline by nature, Supabase adapter is direct. A queue with last-write-wins on `updated_at` is a follow-up.
- **Notifications and IAP cannot run in the web preview.** Code-complete in Phase F, but they need a device build to verify.
- **Self-report has no ground truth.** Users will inflate "I held the line." That is acceptable and normal for this category, but it is why the Pattern is constrained to reporting what was self-reported and never to claiming measured outcomes.
- **Lesson voice will need your edit pass.** The JSON pipeline makes that a text edit, not a code change.
