-- Mr. Brownie Phase 2: persona logging, tone vectors, editable persona prompts

alter table public.mr_brownie_turn_logs
  add column if not exists active_persona text
    check (active_persona is null or active_persona in ('mr_brownie', 'mrs_cookie')),
  add column if not exists sentiment_score numeric(4, 2)
    check (sentiment_score is null or (sentiment_score >= -1 and sentiment_score <= 1)),
  add column if not exists confidence_pct smallint
    check (confidence_pct is null or (confidence_pct >= 0 and confidence_pct <= 100));

create index if not exists mr_brownie_turn_logs_persona_idx
  on public.mr_brownie_turn_logs (active_persona, created_at desc);

create table if not exists public.mr_brownie_persona_prompts (
  id            uuid primary key default gen_random_uuid(),
  persona       text not null check (persona in ('mr_brownie', 'mrs_cookie')),
  locale        text not null default 'any'
    check (locale in ('ar', 'en', 'any')),
  instruction   text not null check (char_length(instruction) <= 8000),
  is_published  boolean not null default true,
  version       integer not null default 1 check (version >= 1),
  updated_at    timestamptz not null default now(),
  updated_by    text,
  unique (persona, locale)
);

comment on table public.mr_brownie_persona_prompts is
  'Published persona system instructions; overrides code defaults when is_published=true.';

create table if not exists public.mr_brownie_user_tone (
  clerk_user_id     text primary key,
  formal_casual     numeric(4, 3) not null default 0
    check (formal_casual >= -1 and formal_casual <= 1),
  serious_playful   numeric(4, 3) not null default 0
    check (serious_playful >= -1 and serious_playful <= 1),
  concise_detailed  numeric(4, 3) not null default 0
    check (concise_detailed >= -1 and concise_detailed <= 1),
  interaction_count integer not null default 0 check (interaction_count >= 0),
  updated_at        timestamptz not null default now()
);

comment on table public.mr_brownie_user_tone is
  'Per-user tone vector for micro-personalization; shifts max 10% per feedback signal.';

alter table public.mr_brownie_persona_prompts enable row level security;
alter table public.mr_brownie_user_tone enable row level security;
