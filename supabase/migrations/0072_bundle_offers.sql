-- =============================================================================
-- Cookie Bite — Bundle offers (product + add-on combos with fixed bundle price)
-- =============================================================================

create table if not exists public.bundle_offers (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  product_ids uuid[] not null default '{}',
  addon_items jsonb not null default '[]'::jsonb,
  offer_price_egp numeric(10, 2) not null check (offer_price_egp > 0),
  original_total_egp numeric(10, 2) not null default 0,
  avg_price_per_product_egp numeric(10, 2),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users (id) on delete set null,
  constraint bundle_offers_dates_check check (
    ends_at is null or ends_at > starts_at
  )
);

create index if not exists bundle_offers_active_dates_idx
  on public.bundle_offers (is_active, starts_at, ends_at);

create index if not exists bundle_offers_created_at_idx
  on public.bundle_offers (created_at desc);

comment on table public.bundle_offers is
  'Fixed-price bundle offers combining multiple products and/or add-on options.';

comment on column public.bundle_offers.addon_items is
  'Array of { addon_id, option_id } selections included in the bundle.';

alter table public.bundle_offers enable row level security;

drop policy if exists "bundle_offers service only" on public.bundle_offers;
create policy "bundle_offers service only"
  on public.bundle_offers for all using (false) with check (false);

notify pgrst, 'reload schema';
