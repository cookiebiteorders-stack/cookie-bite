-- =============================================================================
-- Cookie Bite — Migration 0085: Finish Clerk → Supabase Auth cleanup
-- =============================================================================

-- 1) users: retire clerk_user_id
--    (0073 already dropped NOT NULL; now drop the unique constraint and column)
alter table public.users
  drop constraint if exists users_clerk_user_id_key;

alter table public.users
  drop column if exists clerk_user_id;

-- 2) Fix broken RLS policies from 0003 / 0006 / 0008 / 0057
--    They compared users.clerk_user_id = auth.jwt()->>'sub', which since 0073
--    matches NOTHING. Replace with the Supabase-native predicate.

-- Example — addresses (from 0003)
drop policy if exists "addresses owner rw" on public.addresses;
create policy "addresses owner rw"
  on public.addresses for all
  using (
    auth.role() = 'service_role'
    or user_id = auth.uid()
  )
  with check (
    auth.role() = 'service_role'
    or user_id = auth.uid()
  );

-- Repeat the same pattern for every policy in 0003 / 0006 / 0008 that used:
--   user_id = (select id from public.users where clerk_user_id = auth.jwt()->>'sub')
-- and rewrite as:
--   user_id = auth.uid()
-- because public.users.id == auth.users.id under the new model.

-- 3) Rename clerk_user_id → supabase_user_id in feature tables that still store
--    an identity. Skip if columns don't exist.

DO $$
BEGIN
  -- copilot_operator_memory
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'copilot_operator_memory' 
    AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'copilot_operator_memory' 
    AND column_name = 'clerk_user_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.copilot_operator_memory RENAME COLUMN clerk_user_id TO supabase_user_id;
  END IF;
  
  -- admin_presence
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'admin_presence' 
    AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_presence' 
    AND column_name = 'clerk_user_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.admin_presence RENAME COLUMN clerk_user_id TO supabase_user_id;
  END IF;
  
  -- mr_brownie_chat_messages
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'mr_brownie_chat_messages' 
    AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mr_brownie_chat_messages' 
    AND column_name = 'clerk_user_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.mr_brownie_chat_messages RENAME COLUMN clerk_user_id TO supabase_user_id;
  END IF;
  
  -- mr_brownie_turn_logs
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'mr_brownie_turn_logs' 
    AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mr_brownie_turn_logs' 
    AND column_name = 'clerk_user_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.mr_brownie_turn_logs RENAME COLUMN clerk_user_id TO supabase_user_id;
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in clerk column migration: %', SQLERRM;
END $$;

-- Same for: public.mr_brownie_conversations, public.mr_brownie_tone_vectors,
-- public.mr_brownie_feedback (any table listed under Category C.13 above).

-- 4) Make sure the sign-up trigger sets updated_at correctly (small safety fix)
alter table public.users
  alter column updated_at set default now();

-- 5) (Optional but recommended) Re-add the FK to auth.users
--    so we can never again get orphan public.users rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_id_fk_auth_users' 
    AND table_name = 'users'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_fk_auth_users
      FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
      NOT VALID;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error adding FK constraint: %', SQLERRM;
END $$;
