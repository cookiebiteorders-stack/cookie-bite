-- Blocked customer emails — prevents re-registration after ban/delete
create table if not exists public.blocked_emails (
  email text primary key,
  reason text,
  blocked_by_user_id uuid references public.users(id) on delete set null,
  blocked_by_email text,
  customer_user_id uuid references public.users(id) on delete set null,
  blocked_at timestamptz not null default now()
);

create index if not exists blocked_emails_blocked_at_idx
  on public.blocked_emails (blocked_at desc);

alter table public.blocked_emails enable row level security;

drop policy if exists "blocked_emails service role all" on public.blocked_emails;
create policy "blocked_emails service role all"
  on public.blocked_emails for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
