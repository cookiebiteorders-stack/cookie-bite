-- Shareable wishlist snapshots (public read via token)
create table if not exists public.wishlist_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  share_token text not null unique,
  title text,
  product_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists wishlist_shares_token_idx on public.wishlist_shares (share_token);
create index if not exists wishlist_shares_user_idx on public.wishlist_shares (user_id);

alter table public.wishlist_shares enable row level security;

drop policy if exists "wishlist_shares owner manage" on public.wishlist_shares;
create policy "wishlist_shares owner manage"
  on public.wishlist_shares for all
  using (
    user_id = (select id from public.users where clerk_user_id = auth.jwt()->>'sub')
  )
  with check (
    user_id = (select id from public.users where clerk_user_id = auth.jwt()->>'sub')
  );
