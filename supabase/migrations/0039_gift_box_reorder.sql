-- Feature 2: reorder gift box from account

alter table public.orders
  add column if not exists order_type text not null default 'standard'
    check (order_type in ('standard', 'gift_box')),
  add column if not exists gift_box_snapshot jsonb;

create index if not exists idx_orders_order_type on public.orders (order_type);
create index if not exists idx_orders_gift_box_snapshot on public.orders (order_type)
  where gift_box_snapshot is not null;
