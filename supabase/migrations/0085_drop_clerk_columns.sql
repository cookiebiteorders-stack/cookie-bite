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
--    an identity, but preserve backward compatibility with a generated column
--    for one release. Drop the generated column in the NEXT migration once code
--    is fully switched.

alter table public.copilot_operator_memory
  rename column clerk_user_id to supabase_user_id;
alter table public.copilot_operator_memory
  add column clerk_user_id text generated always as (supabase_user_id) stored;

alter table public.admin_presence
  rename column clerk_user_id to supabase_user_id;
alter table public.admin_presence
  add column clerk_user_id text generated always as (supabase_user_id) stored;

alter table public.mr_brownie_chat_messages
  rename column clerk_user_id to supabase_user_id;
alter table public.mr_brownie_chat_messages
  add column clerk_user_id text generated always as (supabase_user_id) stored;

alter table public.mr_brownie_turn_logs
  rename column clerk_user_id to supabase_user_id;
alter table public.mr_brownie_turn_logs
  add column clerk_user_id text generated always as (supabase_user_id) stored;

-- Same for: public.mr_brownie_conversations, public.mr_brownie_tone_vectors,
-- public.mr_brownie_feedback (any table listed under Category C.13 above).

-- 4) Make sure the sign-up trigger sets updated_at correctly (small safety fix)
alter table public.users
  alter column updated_at set default now();

-- 5) (Optional but recommended) Re-add the FK to auth.users
--    so we can never again get orphan public.users rows
alter table public.users
  add constraint users_id_fk_auth_users
    foreign key (id) references auth.users (id) on delete cascade
    not valid;
-- validate later:  alter table public.users validate constraint users_id_fk_auth_users;
