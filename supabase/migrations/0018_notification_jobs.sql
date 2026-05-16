-- Async notification job queue (fallback when Redis/Bull is unavailable)
create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null
    check (job_type in ('order_confirmation', 'payment_confirmation')),
  order_id uuid not null references public.orders(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts int not null default 0,
  max_attempts int not null default 3,
  error_message text,
  scheduled_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notification_jobs_pending_idx
  on public.notification_jobs (status, scheduled_at)
  where status = 'pending';

alter table public.invoices
  add column if not exists pdf_generated_at timestamptz;

alter table public.notification_jobs enable row level security;

drop policy if exists "notification_jobs service role all" on public.notification_jobs;
create policy "notification_jobs service role all"
  on public.notification_jobs for all
  using (auth.role() = 'service_role' or is_admin_or_owner())
  with check (auth.role() = 'service_role' or is_admin_or_owner());
