-- =============================================================================
-- Cookie Bite — Migration 0022: ensure orders.payment_status exists
-- يصلح قواعد أنشئت قبل 0001 الكامل أو بدون عمود payment_status.
-- =============================================================================

alter table public.orders
  add column if not exists payment_status text;

update public.orders
set payment_status = 'unpaid'
where payment_status is null;

alter table public.orders
  alter column payment_status set default 'unpaid';

alter table public.orders
  alter column payment_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_payment_status_check
      check (payment_status in ('unpaid', 'paid', 'refunded', 'failed'));
  end if;
end $$;

comment on column public.orders.payment_status is
  'Payment lifecycle: unpaid | paid | refunded | failed';
