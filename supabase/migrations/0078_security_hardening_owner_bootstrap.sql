-- =============================================================================
-- Cookie Bite — Migration 0078: Security hardening (owner auto-grant + search_path)
-- =============================================================================
--
-- 1) handle_new_auth_user(): previously granted the 'owner' role to *any*
--    Supabase Auth sign-up whose email matched app.owner_bootstrap_email /
--    the hardcoded default. That email is publicly known (it's the store's
--    published contact address), so if Supabase email confirmation is ever
--    disabled — or an owner account has not been created yet — this allowed
--    unauthenticated privilege escalation to full 'owner' access.
--
--    Fix: the bootstrap grant now only fires while there is NOT already an
--    owner in public.users. Once the real owner account exists, this path is
--    permanently closed and every new sign-up defaults to 'customer'. This
--    preserves the "first run" bootstrap convenience without leaving a
--    standing privilege-escalation vector in a live store.
--
-- 2) Pin `search_path` on trigger functions added after the 0071 hardening
--    pass, for consistency with every other function in the schema (defends
--    against search_path hijacking if these functions are ever extended to
--    reference unqualified objects).
-- =============================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_role text;
begin
  v_email := lower(trim(coalesce(NEW.email, '')));
  if v_email = '' then
    return NEW;
  end if;

  v_role := case
    when v_email = lower(trim(coalesce(current_setting('app.owner_bootstrap_email', true), 'cookie.bite.orders@gmail.com')))
      and not exists (select 1 from public.users where role = 'owner')
      then 'owner'
    else 'customer'
  end;

  insert into public.users (
    id,
    email,
    full_name,
    avatar_url,
    role
  )
  values (
    NEW.id,
    v_email,
    coalesce(
      nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(NEW.raw_user_meta_data->>'name'), '')
    ),
    nullif(trim(NEW.raw_user_meta_data->>'avatar_url'), ''),
    v_role
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
    updated_at = now();

  return NEW;
end;
$$;

-- ---------------------------------------------------------------------------
-- search_path pinning for post-0071 trigger functions
-- ---------------------------------------------------------------------------
alter function public.tg_orders_extract_phone() set search_path = public;
alter function public.tg_orders_extract_customer_fields() set search_path = public;
alter function public.tg_order_items_normalize() set search_path = public;
