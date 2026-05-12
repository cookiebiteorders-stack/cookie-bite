-- سجل محادثات Mr. Brownie: مستخدم مسجّل (clerk_user_id) أو ضيف (guest_session_id)
-- الحقول: created_at, sender_role (user | assistant), message_content

create table if not exists public.mr_brownie_chat_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sender_role text not null check (sender_role in ('user', 'assistant')),
  message_content text not null check (char_length(message_content) <= 12000),
  clerk_user_id text,
  guest_session_id uuid,
  constraint mr_brownie_chat_identity_ck check (
    (clerk_user_id is not null and guest_session_id is null)
    or (clerk_user_id is null and guest_session_id is not null)
  )
);

create index if not exists mr_brownie_chat_messages_clerk_created_idx
  on public.mr_brownie_chat_messages (clerk_user_id, created_at desc);

create index if not exists mr_brownie_chat_messages_guest_created_idx
  on public.mr_brownie_chat_messages (guest_session_id, created_at desc);

comment on table public.mr_brownie_chat_messages is
  'Mr Brownie chat persistence; writes via service-role API only (no direct anon access).';

alter table public.mr_brownie_chat_messages enable row level security;
