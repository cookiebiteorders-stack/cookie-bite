-- Feature 4: abandoned cart recovery (email reminders + recovery link)

create table if not exists public.abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  email text,
  phone text,
  cart_snapshot jsonb not null,
  recovery_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  reminder_1_sent_at timestamptz,
  reminder_2_sent_at timestamptz,
  recovered_at timestamptz,
  is_recovered boolean not null default false,
  cart_value numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_abandoned_carts_token on public.abandoned_carts (recovery_token);
create index if not exists idx_abandoned_carts_user on public.abandoned_carts (user_id)
  where user_id is not null;
create index if not exists idx_abandoned_carts_pending on public.abandoned_carts (created_at)
  where is_recovered = false;

create table if not exists public.recovery_discount_codes (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.abandoned_carts (id) on delete cascade,
  code text unique not null,
  discount_percent int not null default 10 check (discount_percent between 1 and 50),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  is_used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_recovery_discount_codes_code on public.recovery_discount_codes (upper(code));

alter table public.abandoned_carts enable row level security;
alter table public.recovery_discount_codes enable row level security;
