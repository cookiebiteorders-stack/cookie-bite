-- =============================================================================
-- Cookie Bite — Migration 0063: Product catalog Phase 4
-- product versions (undo) + collection management indexes
-- =============================================================================

create table if not exists public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  reason text,
  audit_log_id uuid,
  created_by uuid,
  created_by_email text,
  created_at timestamptz not null default now(),
  unique (product_id, version_number)
);

create index if not exists idx_product_versions_product_created
  on public.product_versions (product_id, created_at desc);

create index if not exists idx_product_versions_audit_log
  on public.product_versions (audit_log_id)
  where audit_log_id is not null;

alter table public.product_versions enable row level security;

notify pgrst, 'reload schema';
