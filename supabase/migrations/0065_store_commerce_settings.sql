-- =============================================================================
-- Cookie Bite — Store commerce settings (free shipping threshold, etc.)
-- =============================================================================

create table if not exists public.store_commerce_settings (
  id text primary key default 'global',
  free_shipping_threshold_egp numeric(10,2) not null default 500 check (free_shipping_threshold_egp >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id) on delete set null
);

insert into public.store_commerce_settings (id, free_shipping_threshold_egp)
values ('global', 500)
on conflict (id) do nothing;

alter table public.store_commerce_settings enable row level security;

drop policy if exists "store_commerce_settings service only" on public.store_commerce_settings;
create policy "store_commerce_settings service only"
  on public.store_commerce_settings
  for all
  using (false)
  with check (false);

notify pgrst, 'reload schema';
