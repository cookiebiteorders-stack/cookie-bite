-- =============================================================================
-- Cookie Bite — Migration 0091: Add Multiple Owner Bootstrap Emails
-- =============================================================================
-- This migration adds support for multiple owner bootstrap emails and
-- updates existing users with these emails to owner role.
-- =============================================================================

-- Step 1: Create a function to check if email is in owner bootstrap list
CREATE OR REPLACE FUNCTION public.is_owner_bootstrap_email(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_owner_emails text[];
  v_normalized_email text;
begin
  v_normalized_email := lower(trim(p_email));
  
  -- Get owner bootstrap emails from settings or use default list
  -- For now, use the hardcoded list from the request
  v_owner_emails := ARRAY[
    'bitecookie532@gmail.com',
    'cookie.bite.orders@gmail.com',
    'fatmaelbeshawy75@gmail.com',
    'mohamedabbasyounis@gmail.com',
    'mohamedalwardani1@gmail.com'
  ];
  
  RETURN v_normalized_email = ANY(v_owner_emails);
END;
$$;

-- Grant execute to service_role only
REVOKE ALL ON FUNCTION public.is_owner_bootstrap_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner_bootstrap_email(text) TO service_role;

-- Step 2: Update existing users with owner bootstrap emails to owner role
UPDATE public.users
SET 
  role = 'owner',
  updated_at = now()
WHERE email IN (
  'bitecookie532@gmail.com',
  'cookie.bite.orders@gmail.com',
  'fatmaelbeshawy75@gmail.com  ',
  'mohamedabbasyounis@gmail.com',
  'mohamedalwardani1@gmail.com'
)
AND role != 'owner';

-- Step 3: Update auth trigger to use multiple owner bootstrap emails
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_email text;
  v_role text;
  v_existing_role text;
  v_existing_user_exists boolean;
begin
  v_email := lower(trim(coalesce(NEW.email, '')));
  if v_email = '' then
    return NEW;
  end if;

  -- Check if user already exists in users table
  SELECT role INTO v_existing_role
  FROM public.users
  WHERE id = NEW.id;
  
  v_existing_user_exists := (v_existing_role IS NOT NULL);

  -- Only assign bootstrap owner role if:
  -- 1. No existing user record, AND
  -- 2. Email is in owner bootstrap list, AND
  -- 3. No owner exists in the system
  if NOT v_existing_user_exists then
    v_role := case
      when public.is_owner_bootstrap_email(v_email)
        AND NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'owner')
        then 'owner'
      else 'customer'
    end;
  else
    -- Preserve existing role - never downgrade during auth trigger
    v_role := v_existing_role;
  end if;

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
    -- NEVER update role on conflict - preserve existing role
    updated_at = now();

  return NEW;
end;
$$;

-- Step 4: Update resolveStaffRoleFromEmail to check multiple owner emails
-- This will be updated in the application code (lib/admin/auth-role.ts)

-- Step 5: Add comment documenting the owner bootstrap emails
COMMENT ON FUNCTION public.is_owner_bootstrap_email(text) IS 
'Check if email is in the owner bootstrap list. Owner bootstrap emails: bitecookie532@gmail.com, cookie.bite.orders@gmail.com, fatmaelbeshawy75@gmail.com, mohamedabbasyounis@gmail.com, mohamedalwardani1@gmail.com';

-- Step 6: Verify owners were updated
DO $$
declare
  v_owner_count int;
begin
  SELECT count(*) INTO v_owner_count
  FROM public.users
  WHERE role = 'owner';
  
  RAISE NOTICE 'Updated owner count: %', v_owner_count;
  
  IF v_owner_count = 0 THEN
    RAISE WARNING 'No owners found in the system after migration';
  END IF;
END $$;
