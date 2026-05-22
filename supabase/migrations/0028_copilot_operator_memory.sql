-- Operator memory for Mrs. Cookie (brand tone, page drafts, preferences)
create table if not exists public.copilot_operator_memory (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'global',
  clerk_user_id text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (scope, clerk_user_id)
);

create index if not exists copilot_operator_memory_clerk_idx
  on public.copilot_operator_memory (clerk_user_id);

alter table public.copilot_operator_memory enable row level security;

-- Service role only (admin copilot API uses service key)
drop policy if exists "copilot memory service only" on public.copilot_operator_memory;
create policy "copilot memory service only"
  on public.copilot_operator_memory
  for all
  using (false)
  with check (false);
