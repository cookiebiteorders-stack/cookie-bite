-- Universal import/export audit + failed row tracking
-- Storage bucket: create "admin-imports" in Supabase Dashboard (private) or via API

create table if not exists public.import_logs (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  file_name text not null,
  file_type text not null check (file_type in ('csv', 'xlsx', 'pdf')),
  storage_path text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed', 'partial')),
  total_rows int not null default 0,
  success_rows int not null default 0,
  failed_rows int not null default 0,
  duplicate_rows int not null default 0,
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_by_clerk text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists import_logs_module_created_idx
  on public.import_logs (module, created_at desc);
create index if not exists import_logs_status_idx
  on public.import_logs (status);

create table if not exists public.export_logs (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  format text not null check (format in ('csv', 'xlsx', 'pdf')),
  scope text not null default 'filtered'
    check (scope in ('all', 'filtered', 'selected')),
  row_count int not null default 0,
  storage_path text,
  download_url text,
  filters jsonb not null default '{}'::jsonb,
  status text not null default 'completed'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  error_summary text,
  created_by uuid references public.users(id) on delete set null,
  created_by_clerk text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists export_logs_module_created_idx
  on public.export_logs (module, created_at desc);

create table if not exists public.failed_imports (
  id uuid primary key default gen_random_uuid(),
  import_log_id uuid not null references public.import_logs(id) on delete cascade,
  row_number int not null,
  row_data jsonb not null default '{}'::jsonb,
  error_message text not null,
  created_at timestamptz not null default now()
);

create index if not exists failed_imports_log_idx
  on public.failed_imports (import_log_id);

alter table public.import_logs enable row level security;
alter table public.export_logs enable row level security;
alter table public.failed_imports enable row level security;

drop policy if exists "import_logs service role all" on public.import_logs;
create policy "import_logs service role all"
  on public.import_logs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "export_logs service role all" on public.export_logs;
create policy "export_logs service role all"
  on public.export_logs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "failed_imports service role all" on public.failed_imports;
create policy "failed_imports service role all"
  on public.failed_imports for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
