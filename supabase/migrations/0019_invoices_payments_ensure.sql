-- Ensure invoices + payments exist on production (0008 may not have been applied).
-- Safe to re-run: uses IF NOT EXISTS throughout.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  amount numeric(10,2) not null default 0 check (amount >= 0),
  method text,
  transaction_id text,
  status text not null default 'pending'
    check (status in ('pending','paid','failed','refunded')),
  provider text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_order_idx on public.payments (order_id);
create index if not exists payments_status_created_idx on public.payments (status, created_at desc);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(10,2) not null default 0 check (amount >= 0),
  status text not null default 'pending'
    check (status in ('pending','paid','failed','refunded')),
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_order_idx on public.invoices (order_id);
create index if not exists invoices_status_issued_idx on public.invoices (status, issued_at desc);

alter table public.invoices
  add column if not exists pdf_generated_at timestamptz;

alter table public.payments enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "payments service role all" on public.payments;
create policy "payments service role all"
  on public.payments for all
  using (auth.role() = 'service_role' or is_admin_or_owner())
  with check (auth.role() = 'service_role' or is_admin_or_owner());

drop policy if exists "payments own read" on public.payments;
create policy "payments own read"
  on public.payments for select
  using (
    auth.role() = 'service_role'
    or exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "invoices service role all" on public.invoices;
create policy "invoices service role all"
  on public.invoices for all
  using (auth.role() = 'service_role' or is_admin_or_owner())
  with check (auth.role() = 'service_role' or is_admin_or_owner());

drop policy if exists "invoices own read" on public.invoices;
create policy "invoices own read"
  on public.invoices for select
  using (
    auth.role() = 'service_role'
    or exists (
      select 1 from public.orders o
      where o.id = invoices.order_id and o.user_id = auth.uid()
    )
  );

drop trigger if exists trg_invoices_updated on public.invoices;
create trigger trg_invoices_updated
  before update on public.invoices
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_payments_updated on public.payments;
create trigger trg_payments_updated
  before update on public.payments
  for each row execute function public.tg_set_updated_at();
