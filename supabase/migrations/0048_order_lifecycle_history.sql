-- سجل إنشاء/حذف الطلبات (غير قابل للحذف اليدوي — يُنظَّف تلقائياً بعد 30 يوماً عبر cron).

create table if not exists public.order_lifecycle_events (
  id            uuid primary key default gen_random_uuid(),
  event_type    text not null check (event_type in ('created', 'deleted')),
  order_id      uuid not null,
  order_ref     text,
  payload       jsonb not null default '{}'::jsonb,
  actor_id      uuid references public.users(id) on delete set null,
  actor_email   text,
  actor_role    text,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '30 days')
);

create index if not exists order_lifecycle_events_expires_idx
  on public.order_lifecycle_events (expires_at);

create index if not exists order_lifecycle_events_order_idx
  on public.order_lifecycle_events (order_id, created_at desc);

create index if not exists order_lifecycle_events_type_created_idx
  on public.order_lifecycle_events (event_type, created_at desc);

comment on table public.order_lifecycle_events is
  'Immutable order create/delete snapshots (30-day retention). Purged by POST /api/cron/order-lifecycle-purge.';

alter table public.order_lifecycle_events enable row level security;

drop policy if exists "order_lifecycle_events no update" on public.order_lifecycle_events;
create policy "order_lifecycle_events no update"
  on public.order_lifecycle_events for update
  using (false) with check (false);

drop policy if exists "order_lifecycle_events no delete" on public.order_lifecycle_events;
create policy "order_lifecycle_events no delete"
  on public.order_lifecycle_events for delete
  using (false);
