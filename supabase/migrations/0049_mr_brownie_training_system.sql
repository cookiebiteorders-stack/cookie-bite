-- Mr. Brownie: feedback loop + few-shot training examples (service-role writes only)

create table if not exists public.mr_brownie_training_examples (
  id                uuid primary key default gen_random_uuid(),
  intent            text not null,
  locale            text not null default 'any'
    check (locale in ('ar', 'en', 'any')),
  user_message      text not null check (char_length(user_message) <= 2000),
  ideal_response    text not null check (char_length(ideal_response) <= 4000),
  bad_response      text check (bad_response is null or char_length(bad_response) <= 4000),
  weight            integer not null default 1 check (weight between 1 and 10),
  is_active         boolean not null default true,
  source            text not null default 'manual'
    check (source in ('seed', 'feedback', 'manual', 'correction')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists mr_brownie_training_examples_active_idx
  on public.mr_brownie_training_examples (is_active, locale, intent);

comment on table public.mr_brownie_training_examples is
  'Few-shot examples for Mr. Brownie; merged with code seed at runtime.';

create table if not exists public.mr_brownie_feedback (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  rating              smallint not null check (rating in (1, -1)),
  user_message        text not null check (char_length(user_message) <= 12000),
  assistant_message   text not null check (char_length(assistant_message) <= 12000),
  intent              text,
  comment             text check (comment is null or char_length(comment) <= 500),
  session_id          text,
  pathname            text,
  locale              text,
  clerk_user_id       text,
  guest_session_id    uuid,
  promoted_example_id uuid references public.mr_brownie_training_examples (id) on delete set null
);

create index if not exists mr_brownie_feedback_created_idx
  on public.mr_brownie_feedback (created_at desc);

create index if not exists mr_brownie_feedback_rating_idx
  on public.mr_brownie_feedback (rating, created_at desc);

comment on table public.mr_brownie_feedback is
  'User thumbs on assistant replies; feed training pipeline and promotion script.';

alter table public.mr_brownie_training_examples enable row level security;
alter table public.mr_brownie_feedback enable row level security;
