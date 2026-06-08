-- =============================================================================
-- Cookie Bite — Store business settings (work hours, etc.)
-- =============================================================================

create table if not exists public.store_business_settings (
  id text primary key default 'global',
  hours_en text not null default 'Sun–Thu · 10am – 8pm',
  hours_ar text not null default 'الأحد–الخميس · 10ص – 8م',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id) on delete set null
);

insert into public.store_business_settings (id)
values ('global')
on conflict (id) do nothing;

alter table public.store_business_settings enable row level security;

drop policy if exists "store_business_settings service only" on public.store_business_settings;
create policy "store_business_settings service only"
  on public.store_business_settings
  for all
  using (false)
  with check (false);

notify pgrst, 'reload schema';
