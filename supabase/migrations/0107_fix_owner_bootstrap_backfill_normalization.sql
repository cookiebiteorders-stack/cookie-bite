-- =============================================================================
-- Cookie Bite — Migration 0107: Fix Owner Bootstrap Backfill Normalization
-- =============================================================================
-- This migration fixes the trailing-space bug in migration 0091 that could have
-- prevented fatmaelbeshawy75@gmail.com from being backfilled to owner role.
-- =============================================================================

-- Re-run the backfill with proper normalization to catch any missed users
UPDATE public.users
SET 
  role = 'owner',
  updated_at = now()
WHERE lower(trim(email)) IN (
  'bitecookie532@gmail.com',
  'cookie.bite.orders@gmail.com',
  'fatmaelbeshawy75@gmail.com',
  'mohamedabbasyounis@gmail.com',
  'mohamedalwardani1@gmail.com'
)
AND role != 'owner';

-- Verify the fix by checking for the specific email that had the trailing space issue
DO $$
declare
  v_fatma_owner_count int;
begin
  SELECT count(*) INTO v_fatma_owner_count
  FROM public.users
  WHERE lower(trim(email)) = 'fatmaelbeshawy75@gmail.com' AND role = 'owner';
  
  RAISE NOTICE 'fatmaelbeshawy75@gmail.com owner count after fix: %', v_fatma_owner_count;
  
  IF v_fatma_owner_count = 0 THEN
    RAISE WARNING 'fatmaelbeshawy75@gmail.com is still not an owner after normalization fix';
  END IF;
END $$;
