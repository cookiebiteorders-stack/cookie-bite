-- Feature 6: gift reveal page for recipients

alter table public.orders
  add column if not exists reveal_token text unique default encode(gen_random_bytes(12), 'hex'),
  add column if not exists reveal_viewed_at timestamptz,
  add column if not exists reveal_reaction text;

create index if not exists idx_orders_reveal_token on public.orders (reveal_token)
  where reveal_token is not null;
