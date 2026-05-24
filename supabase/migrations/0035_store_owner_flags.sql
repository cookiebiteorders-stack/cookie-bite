-- =============================================================================
-- Cookie Bite — Owner feature flags (persisted store settings)
-- =============================================================================

create table if not exists public.store_owner_flags (
  id text primary key default 'global',
  flags jsonb not null default '{
    "smart_retries": true,
    "high_contrast_mode": false,
    "maintenance_mode": false,
    "beta_features": false
  }'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id) on delete set null
);

insert into public.store_owner_flags (id)
values ('global')
on conflict (id) do nothing;

alter table public.store_owner_flags enable row level security;

-- Service role only (Next.js admin routes use SUPABASE_SERVICE_KEY).
drop policy if exists "store_owner_flags service only" on public.store_owner_flags;
create policy "store_owner_flags service only"
  on public.store_owner_flags
  for all
  using (false)
  with check (false);
