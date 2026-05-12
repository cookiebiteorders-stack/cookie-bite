-- =============================================================================
-- Cookie Bite — Migration 0007_5: RLS helper is_admin_or_owner (قبل 0008)
-- السبب: سياسات 0008 و 0010 تستدعي is_admin_or_owner()؛ يجب تعريف الدالة قبل 0008
-- على قاعدة جديدة. idempotent وآمن لإعادة التشغيل.
-- =============================================================================

create or replace function public.is_admin_or_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      auth.uid() is not null
      and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role in ('owner', 'admin')
      )
    ),
    false
  );
$$;

comment on function public.is_admin_or_owner() is
  'Returns true when the authenticated user is owner or admin in public.users.';

grant execute on function public.is_admin_or_owner() to authenticated;
grant execute on function public.is_admin_or_owner() to service_role;
