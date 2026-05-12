-- سجل محادثات على مستوى المؤسسة: ربط بـ users.id + session_id للضيف + soft delete + metadata

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  session_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 12000),
  metadata jsonb,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at desc)
  where is_deleted = false;

create index if not exists chat_messages_session_created_idx
  on public.chat_messages (session_id, created_at desc)
  where is_deleted = false;

comment on table public.chat_messages is
  'Enterprise chat persistence; writes via service-role API. session_id always set (guest browser id).';

alter table public.chat_messages enable row level security;
