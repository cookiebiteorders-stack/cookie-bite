-- Paymob Accept: ربط طلب التجارة الإلكترونية من Paymob بصف الطلب لدينا
alter table public.orders
  add column if not exists paymob_accept_order_id bigint;

create index if not exists orders_paymob_accept_order_idx
  on public.orders (paymob_accept_order_id)
  where paymob_accept_order_id is not null;

comment on column public.orders.paymob_accept_order_id is
  'معرّف الطلب من POST /api/ecommerce/orders في Accept API (للمزامنة مع الـ webhook)';
