-- Tracks which local migration files were applied via Management API (scripts/supabase-run-migrations.mjs)
create table if not exists public.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create index if not exists schema_migrations_applied_idx
  on public.schema_migrations (applied_at desc);

alter table public.schema_migrations enable row level security;

drop policy if exists "schema_migrations service role all" on public.schema_migrations;
create policy "schema_migrations service role all"
  on public.schema_migrations for all
  using (auth.role() = 'service_role' or is_admin_or_owner())
  with check (auth.role() = 'service_role' or is_admin_or_owner());
