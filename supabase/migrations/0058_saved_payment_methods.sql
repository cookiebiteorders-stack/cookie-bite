-- Saved customer payment preferences (no raw card PAN/CVV — display hints only)
create table if not exists public.saved_payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  method_type text not null
    check (method_type in ('card', 'wallet', 'instapay', 'fawry', 'cod')),
  label text not null default 'Default',
  wallet_provider text,
  account_hint text,
  card_last4 text check (card_last4 is null or card_last4 ~ '^\d{4}$'),
  cardholder_name text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_payment_methods_user_idx
  on public.saved_payment_methods (user_id);

create index if not exists saved_payment_methods_user_default_idx
  on public.saved_payment_methods (user_id, is_default desc, created_at desc);

alter table public.saved_payment_methods enable row level security;

drop policy if exists "saved_payment_methods service role all" on public.saved_payment_methods;
create policy "saved_payment_methods service role all"
  on public.saved_payment_methods for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
