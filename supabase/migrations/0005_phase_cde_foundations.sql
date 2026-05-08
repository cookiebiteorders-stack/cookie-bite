-- =============================================================================
-- Cookie Bite — Migration 0005: Phase C/D/E foundations (additive)
-- =============================================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'operations',
  amount_egp numeric(12,2) not null check (amount_egp >= 0),
  expense_date date not null default current_date,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_date_idx
  on public.expenses (expense_date desc);
create index if not exists expenses_category_idx
  on public.expenses (category);

alter table public.expenses enable row level security;

drop policy if exists "expenses service role all" on public.expenses;
create policy "expenses service role all"
  on public.expenses
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  cities text[] not null default '{}',
  base_fee_egp numeric(10,2) not null default 0,
  free_shipping_threshold_egp numeric(10,2),
  eta_min_days int not null default 1,
  eta_max_days int not null default 3,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shipping_zones_active_idx
  on public.shipping_zones (is_active);

alter table public.shipping_zones enable row level security;

drop policy if exists "shipping_zones public read" on public.shipping_zones;
create policy "shipping_zones public read"
  on public.shipping_zones
  for select
  using (true);

drop policy if exists "shipping_zones service role all" on public.shipping_zones;
create policy "shipping_zones service role all"
  on public.shipping_zones
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email','sms','whatsapp','push')),
  key text not null,
  language text not null default 'en' check (language in ('en','ar')),
  subject text,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel, key, language)
);

create index if not exists notification_templates_lookup_idx
  on public.notification_templates (channel, key, language, is_active);

alter table public.notification_templates enable row level security;

drop policy if exists "notification_templates service role all" on public.notification_templates;
create policy "notification_templates service role all"
  on public.notification_templates
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "notification_templates public read active" on public.notification_templates;
create policy "notification_templates public read active"
  on public.notification_templates
  for select
  using (is_active = true);

-- =============================================================================
