create table if not exists public.addons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text null,
  type text not null check (type in ('single_choice', 'multiple_choice')),
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_addons (
  product_id uuid not null references public.products(id) on delete cascade,
  addon_id uuid not null references public.addons(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, addon_id)
);

alter table public.order_items
  add column if not exists selected_addons jsonb not null default '[]'::jsonb,
  add column if not exists addons_total_egp numeric(10,2) not null default 0,
  add column if not exists final_total_egp numeric(10,2) null;

-- Backfill final_total_egp only when legacy column names exist (prod schemas may differ).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'order_items'
      and column_name = 'unit_price_egp'
  ) then
    update public.order_items
    set final_total_egp = coalesce(
      total_price_egp,
      unit_price_egp * quantity,
      final_total_egp
    )
    where final_total_egp is null;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'order_items'
      and column_name = 'total_price_egp'
  ) then
    update public.order_items
    set final_total_egp = coalesce(total_price_egp, final_total_egp)
    where final_total_egp is null;
  end if;
end $$;

create index if not exists idx_product_addons_product_id on public.product_addons(product_id);
create index if not exists idx_product_addons_addon_id on public.product_addons(addon_id);

alter table public.addons enable row level security;
alter table public.product_addons enable row level security;

notify pgrst, 'reload schema';
