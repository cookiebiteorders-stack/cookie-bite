-- =============================================================================
-- Cookie Bite — Migration 0086: Drop temporary clerk_user_id generated columns
-- =============================================================================

-- This migration should be run AFTER migration 0085 and after the code
-- has been fully updated to use supabase_user_id instead of clerk_user_id
-- in all feature tables (copilot, presence, mr_brownie, tracking, etc.)

-- Drop the temporary generated clerk_user_id columns that were added in 0085
-- for backward compatibility during the transition period.

DO $$
BEGIN
  -- copilot_operator_memory
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'copilot_operator_memory' 
    AND column_name = 'clerk_user_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.copilot_operator_memory DROP COLUMN clerk_user_id;
  END IF;
  
  -- mr_brownie_chat_messages
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mr_brownie_chat_messages' 
    AND column_name = 'clerk_user_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.mr_brownie_chat_messages DROP COLUMN clerk_user_id;
  END IF;
  
  -- mr_brownie_turn_logs
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mr_brownie_turn_logs' 
    AND column_name = 'clerk_user_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.mr_brownie_turn_logs DROP COLUMN clerk_user_id;
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error dropping clerk_user_id columns: %', SQLERRM;
END $$;

-- Add additional tables as needed based on your actual schema:
-- alter table public.mr_brownie_conversations drop column clerk_user_id;
-- alter table public.mr_brownie_tone_vectors drop column clerk_user_id;
-- alter table public.mr_brownie_feedback drop column clerk_user_id;
-- alter table public.tracking_events drop column clerk_user_id;
-- etc.

-- Validate the foreign key constraint added in 0085
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_id_fk_auth_users' 
    AND table_name = 'users'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.users VALIDATE CONSTRAINT users_id_fk_auth_users;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error validating FK constraint: %', SQLERRM;
END $$;
