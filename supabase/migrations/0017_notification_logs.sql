-- Automated confirmation & notification audit trail
create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  notification_type text not null
    check (notification_type in (
      'order_confirmation',
      'payment_confirmation',
      'invoice',
      'shipping_update',
      'whatsapp',
      'email'
    )),
  channel text not null
    check (channel in ('email', 'whatsapp', 'sms', 'push')),
  recipient text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'failed', 'skipped')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notification_logs_order_idx
  on public.notification_logs (order_id, created_at desc);

create index if not exists notification_logs_type_channel_idx
  on public.notification_logs (order_id, notification_type, channel, status);

alter table public.notification_logs enable row level security;

drop policy if exists "notification_logs service role all" on public.notification_logs;
create policy "notification_logs service role all"
  on public.notification_logs for all
  using (auth.role() = 'service_role' or is_admin_or_owner())
  with check (auth.role() = 'service_role' or is_admin_or_owner());
