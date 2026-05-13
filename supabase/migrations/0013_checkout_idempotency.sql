-- Idempotent checkout: client may send a UUID; duplicate submits return the same order.

alter table public.orders
  add column if not exists checkout_idempotency_key text;

comment on column public.orders.checkout_idempotency_key is
  'Optional client-generated UUID (header Idempotency-Key or body) to dedupe POST /api/orders.';

create unique index if not exists orders_checkout_idempotency_key_unique_idx
  on public.orders (checkout_idempotency_key)
  where checkout_idempotency_key is not null;
