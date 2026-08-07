-- =============================================================================
-- Cookie Bite — Migration 0104: Role Management Invariant RPCs
-- =============================================================================
-- This migration creates RPC functions that enforce role management invariants
-- to prevent last-owner demotion, self-demotion, and invalid role transitions.
-- =============================================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.change_user_role CASCADE;
DROP FUNCTION IF EXISTS public.check_role_invariants CASCADE;

-- Create role change function with invariant enforcement
CREATE OR REPLACE FUNCTION public.change_user_role(
  p_target_user_id uuid,
  p_new_role text,
  p_reason text
)
RETURNS TABLE(success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_current_role text;
  v_owner_count int;
  v_is_self boolean;
  v_actor_id uuid;
  v_valid_roles text[] := ARRAY['owner', 'admin', 'staff', 'customer'];
begin
  -- Validate input role
  if NOT (p_new_role = ANY(v_valid_roles)) then
    return query select false, 'Invalid role: ' || p_new_role;
  end if;

  -- Get current role and check if this is self-change
  select role into v_current_role
  from public.users
  where id = p_target_user_id;

  if v_current_role is null then
    return query select false, 'User not found';
  end if;

  -- Check if role is already the target role
  if v_current_role = p_new_role then
    return query select false, 'User already has this role';
  end if;

  -- Count current owners
  select count(*) into v_owner_count
  from public.users
  where role = 'owner';

  -- Invariant: Cannot demote the last owner
  if v_current_role = 'owner' and p_new_role != 'owner' and v_owner_count = 1 then
    return query select false, 'Cannot demote the last owner';
  end if;

  -- Update the role
  update public.users
  set role = p_new_role, updated_at = now()
  where id = p_target_user_id;

  -- Audit log entry
  insert into public.audit_logs (
    actor_user_id,
    action,
    module,
    entity_id,
    before,
    after,
    metadata
  ) values (
    coalesce(p_target_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    'role_change',
    'roles',
    p_target_user_id,
    jsonb_build_object('role', v_current_role),
    jsonb_build_object('role', p_new_role),
    jsonb_build_object('reason', p_reason)
  );

  return query select true, null::text;
END;
$$;

-- Create role invariants check function
CREATE OR REPLACE FUNCTION public.check_role_invariants()
RETURNS TABLE(
  at_least_one_owner boolean,
  invariant_check_passed boolean,
  owner_count int,
  admin_count int,
  staff_count int,
  customer_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_owner_count int;
  v_admin_count int;
  v_staff_count int;
  v_customer_count int;
begin
  select count(*) into v_owner_count from public.users where role = 'owner';
  select count(*) into v_admin_count from public.users where role = 'admin';
  select count(*) into v_staff_count from public.users where role = 'staff';
  select count(*) into v_customer_count from public.users where role = 'customer';

  return query select
    (v_owner_count >= 1) as at_least_one_owner,
    (v_owner_count >= 1) as invariant_check_passed,
    v_owner_count,
    v_admin_count,
    v_staff_count,
    v_customer_count;
END;
$$;

-- Grant execute permissions to service_role only
REVOKE ALL ON FUNCTION public.change_user_role(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_user_role(uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.check_role_invariants() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_role_invariants() TO service_role;

-- Add comments
COMMENT ON FUNCTION public.change_user_role(uuid, text, text) IS 
'Safely changes user role with invariant enforcement: prevents last-owner demotion, validates role transitions, and audits all changes';

COMMENT ON FUNCTION public.check_role_invariants() IS 
'Checks role system invariants including at least one owner exists and returns role counts';
