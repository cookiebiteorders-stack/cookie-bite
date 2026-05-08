-- =============================================================================
-- Cookie Bite — Migration 0004: Audit Logs (immutable)
-- لا يحذف ولا يعدّل سجلاته أحد — سياسة RLS تمنع UPDATE/DELETE حتى من service.
-- =============================================================================

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.users(id) on delete set null,
  actor_email text,
  actor_role  text check (actor_role in ('owner','admin','staff','customer','system')),
  action      text not null,                    -- e.g. 'order.update_status'
  module      text not null,                    -- e.g. 'orders' / 'products' / 'auth'
  entity_id   text,                             -- معرّف الكائن المتأثر
  before      jsonb,
  after       jsonb,
  metadata    jsonb default '{}'::jsonb,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_created_idx
  on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor_id);
create index if not exists audit_logs_module_action_idx
  on public.audit_logs (module, action);
create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_id);

alter table public.audit_logs enable row level security;

-- لا أحد يكتب من anon أو غير المصرح؛ التطبيق يكتب عبر service-role فقط.
-- لكن نمنع UPDATE/DELETE صراحة لجعل الجدول immutable حتى مع service.
drop policy if exists "audit_logs no update" on public.audit_logs;
create policy "audit_logs no update"
  on public.audit_logs for update
  using (false) with check (false);

drop policy if exists "audit_logs no delete" on public.audit_logs;
create policy "audit_logs no delete"
  on public.audit_logs for delete
  using (false);

-- =============================================================================
