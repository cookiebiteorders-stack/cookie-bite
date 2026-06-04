-- Mr. Brownie: log every turn for training pipeline (service-role only)

create table if not exists public.mr_brownie_turn_logs (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  user_message        text not null check (char_length(user_message) <= 12000),
  assistant_message   text not null check (char_length(assistant_message) <= 12000),
  intent              text,
  personality_mode    text check (personality_mode in ('friendly', 'sales', 'support')),
  page_intent         text,
  pathname            text,
  locale              text,
  quality_score       smallint check (quality_score is null or (quality_score >= 0 and quality_score <= 100)),
  quality_issues      jsonb,
  session_id          text,
  clerk_user_id       text,
  guest_session_id    uuid,
  catalog_total       integer,
  feedback_rating     smallint check (feedback_rating is null or feedback_rating in (1, -1))
);

create index if not exists mr_brownie_turn_logs_created_idx
  on public.mr_brownie_turn_logs (created_at desc);

create index if not exists mr_brownie_turn_logs_intent_idx
  on public.mr_brownie_turn_logs (intent, created_at desc);

comment on table public.mr_brownie_turn_logs is
  'Full conversation turns for auto-improvement; link feedback via session + message match.';

alter table public.mr_brownie_turn_logs enable row level security;
