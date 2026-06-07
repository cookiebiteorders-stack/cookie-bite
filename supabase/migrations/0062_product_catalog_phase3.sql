-- =============================================================================
-- Cookie Bite — Migration 0062: Product catalog Phase 3
-- scheduling, discount timers, catalog automation settings
-- =============================================================================

alter table public.products
  add column if not exists publish_at timestamptz,
  add column if not exists discount_ends_at timestamptz;

create index if not exists products_publish_at_idx
  on public.products (publish_at)
  where publish_at is not null and is_active = false;

create index if not exists products_discount_ends_at_idx
  on public.products (discount_ends_at)
  where discount_ends_at is not null;

create table if not exists public.product_catalog_settings (
  id text primary key default 'global',
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  auto_deactivate_zero_stock boolean not null default false,
  email_alerts_enabled boolean not null default true,
  alert_recipient_email text,
  alert_cooldown_hours integer not null default 24 check (alert_cooldown_hours >= 1),
  last_stock_alert_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.product_catalog_settings (id)
values ('global')
on conflict (id) do nothing;

alter table public.product_catalog_settings enable row level security;

notify pgrst, 'reload schema';
