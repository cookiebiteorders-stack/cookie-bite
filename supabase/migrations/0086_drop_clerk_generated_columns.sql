-- =============================================================================
-- Cookie Bite — Migration 0086: Drop temporary clerk_user_id generated columns
-- =============================================================================

-- This migration should be run AFTER migration 0085 and after the code
-- has been fully updated to use supabase_user_id instead of clerk_user_id
-- in all feature tables (copilot, presence, mr_brownie, tracking, etc.)

-- Drop the temporary generated clerk_user_id columns that were added in 0085
-- for backward compatibility during the transition period.

alter table public.copilot_operator_memory drop column clerk_user_id;
alter table public.admin_presence drop column clerk_user_id;
alter table public.mr_brownie_chat_messages drop column clerk_user_id;
alter table public.mr_brownie_turn_logs drop column clerk_user_id;

-- Add additional tables as needed based on your actual schema:
-- alter table public.mr_brownie_conversations drop column clerk_user_id;
-- alter table public.mr_brownie_tone_vectors drop column clerk_user_id;
-- alter table public.mr_brownie_feedback drop column clerk_user_id;
-- alter table public.tracking_events drop column clerk_user_id;
-- etc.

-- Validate the foreign key constraint added in 0085
alter table public.users validate constraint users_id_fk_auth_users;
