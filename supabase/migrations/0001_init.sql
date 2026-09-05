-- Mettle initial schema.
--
-- Every user-owned table carries user_id and is protected by RLS keyed on
-- auth.uid(). There is no application-level "current user" filter anywhere in
-- the client: if a policy is missing, queries return nothing rather than
-- returning someone else's rows.
--
-- Content (lessons, concepts, seed scenarios) is NOT in the database. It ships
-- in the app bundle so the product works offline and so writing content stays a
-- text edit in the repo. Only generated scenarios and peer responses live here,
-- because those accumulate across users.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type struggle_path as enum ('anger', 'anxiety', 'distraction', 'discipline');
create type virtue as enum ('wisdom', 'courage', 'temperance', 'justice');
create type verdict as enum ('tempered', 'bending', 'brittle');
create type intention_outcome as enum ('yes', 'no', 'sort_of');
create type time_of_day as enum ('morning', 'afternoon', 'evening');
create type quench_setting as enum ('work', 'home', 'out', 'online');
create type xp_source as enum ('lesson', 'perfect', 'quench', 'spar', 'multi');
create type entitlement_status as enum ('free', 'active');
create type scenario_source as enum ('seed', 'template', 'generated');

-- ---------------------------------------------------------------------------
-- Profiles and entitlement
-- ---------------------------------------------------------------------------

create table profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  struggle_path struggle_path not null,
  onboarding_answers jsonb not null default '{}'::jsonb,
  minutes_commitment smallint not null default 5 check (minutes_commitment in (3, 5, 10)),
  notification_time text not null default '21:00',
  display_name text,
  onboarded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status entitlement_status not null default 'free',
  -- Charged on spar completion, never on start, so an abandoned spar is free.
  spars_used integer not null default 0 check (spars_used >= 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Practice history
-- ---------------------------------------------------------------------------

create table lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  -- Device-local calendar date. Streaks are counted in these, not in UTC, so a
  -- user finishing at 11pm gets credit for the day they actually trained.
  date date not null,
  completed_at timestamptz not null default now(),
  perfect boolean not null default false,
  primary key (user_id, lesson_id)
);

create table intentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  body text not null,
  source_lesson_id text,
  outcome intention_outcome,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table quench_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  held_chip_ids text[] not null default '{}',
  ran_chip_ids text[] not null default '{}',
  held_text text,
  ran_text text,
  -- Optional single taps. These are what let The Pattern say "at work, after
  -- lunch" rather than only "11 times".
  time_of_day time_of_day,
  setting quench_setting,
  seal_line text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table spar_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scenario_id text not null,
  path struggle_path not null,
  virtue virtue not null,
  target_concepts text[] not null default '{}',
  -- [{prompt, instinct, response}] for all three rounds, in order.
  rounds jsonb not null default '[]'::jsonb,
  verdict verdict not null,
  strength text not null default '',
  miss text not null default '',
  reference_answer text not null default '',
  peer_response text,
  date date not null,
  created_at timestamptz not null default now()
);

create table concept_deliveries (
  user_id uuid not null references auth.users (id) on delete cascade,
  concept_id text not null,
  delivered_at timestamptz not null default now(),
  primary key (user_id, concept_id)
);

create table xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null,
  source xp_source not null,
  virtue virtue not null,
  date date not null,
  created_at timestamptz not null default now()
);

create index lesson_progress_user_date_idx on lesson_progress (user_id, date desc);
create index quench_user_date_idx on quench_entries (user_id, date desc);
create index spar_user_date_idx on spar_sessions (user_id, date desc);
create index xp_user_date_idx on xp_events (user_id, date desc);

-- ---------------------------------------------------------------------------
-- Shared scenario pool
--
-- Only generated scenarios land here. Seeds and templates ship in the bundle.
-- Generated rows are shared across users so the pool compounds: one user's
-- generation becomes supply for everyone on that struggle path.
-- ---------------------------------------------------------------------------

create table arena_scenarios (
  id text primary key,
  path struggle_path not null,
  virtue virtue not null,
  target_concepts text[] not null default '{}',
  opening text not null,
  instinct_options text[] not null default '{}',
  escalations jsonb not null default '[]'::jsonb,
  reference_answer text not null default '',
  source scenario_source not null default 'generated',
  created_at timestamptz not null default now()
);

create index arena_scenarios_path_idx on arena_scenarios (path, created_at desc);

-- ---------------------------------------------------------------------------
-- Peer responses
--
-- The one social primitive: after a verdict, the user sees one anonymous
-- Tempered response to the same scenario. No profiles, replies, or follows.
--
-- author_id is retained for moderation and abuse handling ONLY. It is never
-- exposed: the table is unreadable to clients, and reads go through a
-- security-definer function that returns a single body string and nothing else.
--
-- approved defaults to FALSE. Until a response is moderated, the app falls back
-- to the authored exemplars that ship in the bundle. Showing unreviewed
-- user-written text to other users by default is not a risk worth taking for a
-- feature that already works without it.
-- ---------------------------------------------------------------------------

create table peer_responses (
  id uuid primary key default gen_random_uuid(),
  scenario_id text not null,
  body text not null check (length(body) between 20 and 800),
  author_id uuid references auth.users (id) on delete set null,
  approved boolean not null default false,
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);

create index peer_responses_pool_idx
  on peer_responses (scenario_id)
  where approved and not flagged;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table entitlements enable row level security;
alter table lesson_progress enable row level security;
alter table intentions enable row level security;
alter table quench_entries enable row level security;
alter table spar_sessions enable row level security;
alter table concept_deliveries enable row level security;
alter table xp_events enable row level security;
alter table arena_scenarios enable row level security;
alter table peer_responses enable row level security;

-- Owner-only access for every user-owned table.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'entitlements', 'lesson_progress', 'intentions',
    'quench_entries', 'spar_sessions', 'concept_deliveries', 'xp_events'
  ]
  loop
    execute format($f$
      create policy %1$I_select on %1$I for select using (auth.uid() = user_id);
      create policy %1$I_insert on %1$I for insert with check (auth.uid() = user_id);
      create policy %1$I_update on %1$I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
      create policy %1$I_delete on %1$I for delete using (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;

-- Generated scenarios are shared supply: readable by any signed-in user,
-- writable only by the edge function's service role (which bypasses RLS).
create policy arena_scenarios_select on arena_scenarios
  for select to authenticated using (true);

-- No client may read peer_responses directly. Reads go through peer_response()
-- below; writes go through the trigger. Deliberately no policies: RLS with zero
-- policies denies everything.

-- ---------------------------------------------------------------------------
-- Peer response access
-- ---------------------------------------------------------------------------

-- Returns one approved, unflagged response body for a scenario, chosen at
-- random and never the caller's own. Security definer so it can read a table
-- the caller cannot, and it returns only the body: there is no column through
-- which authorship could leak.
create function peer_response(p_scenario_id text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select body
  from peer_responses
  where scenario_id = p_scenario_id
    and approved
    and not flagged
    and (author_id is null or author_id <> auth.uid())
  order by random()
  limit 1;
$$;

revoke all on function peer_response(text) from public;
grant execute on function peer_response(text) to authenticated;

-- A Tempered spar contributes its final round to the pool, pending moderation.
-- Only the last round is taken: it is the response that actually held up under
-- the full escalation, which is the only one worth showing anyone.
create function contribute_peer_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  final_response text;
begin
  if new.verdict <> 'tempered' then
    return new;
  end if;

  select r ->> 'response'
  into final_response
  from jsonb_array_elements(new.rounds) with ordinality as t(r, i)
  order by i desc
  limit 1;

  if final_response is null or length(final_response) < 20 or length(final_response) > 800 then
    return new;
  end if;

  insert into peer_responses (scenario_id, body, author_id)
  values (new.scenario_id, final_response, new.user_id);

  return new;
end $$;

create trigger spar_sessions_contribute_peer
  after insert on spar_sessions
  for each row execute function contribute_peer_response();

-- ---------------------------------------------------------------------------
-- Convenience
-- ---------------------------------------------------------------------------

create function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();
create trigger entitlements_touch before update on entitlements
  for each row execute function touch_updated_at();
