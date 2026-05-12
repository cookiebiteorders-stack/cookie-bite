-- =============================================================================
-- Cookie Bite — Migration 0008: Schema alignment + security hardening
-- الهدف: سد الفجوات بين الكود الحالي والـ DB الفعلية بدون كسر بيانات سابقة.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) gift_boxes (مستخدم في مسارات API الحالية)
-- -----------------------------------------------------------------------------
create table if not exists public.gift_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  share_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  box_size text not null,
  items jsonb not null default '[]'::jsonb,
  gift_message text,
  ribbon_color text not null default 'red',
  has_wrapping boolean not null default false,
  total_price numeric(10,2) not null default 0 check (total_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gift_boxes_user_idx on public.gift_boxes (user_id, created_at desc);
create index if not exists gift_boxes_share_token_idx on public.gift_boxes (share_token);
create index if not exists gift_boxes_active_idx on public.gift_boxes (is_active);

-- Backfill من المخطط الأقدم إن كان موجوداً
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'gift_box_designs'
  ) then
    insert into public.gift_boxes (
      user_id, share_token, box_size, items, gift_message, ribbon_color, has_wrapping, total_price, is_active, created_at
    )
    select
      g.user_id,
      g.share_code,
      g.size::text,
      coalesce(g.selection, '[]'::jsonb),
      g.message,
      coalesce(nullif(g.ribbon, ''), 'red'),
      coalesce(g.wrap, false),
      0,
      true,
      coalesce(g.created_at, now())
    from public.gift_box_designs g
    where g.share_code is not null
    on conflict (share_token) do nothing;
  end if;
end$$;

alter table public.gift_boxes enable row level security;

drop policy if exists "gift_boxes owner read" on public.gift_boxes;
create policy "gift_boxes owner read"
  on public.gift_boxes for select
  using (auth.role() = 'service_role' or user_id = auth.uid());

drop policy if exists "gift_boxes owner write" on public.gift_boxes;
create policy "gift_boxes owner write"
  on public.gift_boxes for all
  using (auth.role() = 'service_role' or user_id = auth.uid())
  with check (auth.role() = 'service_role' or user_id = auth.uid());

drop policy if exists "gift_boxes public read active by token" on public.gift_boxes;
create policy "gift_boxes public read active by token"
  on public.gift_boxes for select
  using (is_active = true);

-- -----------------------------------------------------------------------------
-- B) expenses + payments + invoices (مستخدمة في admin financial / analytics / invoices)
-- -----------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'operations',
  amount_egp numeric(12,2) not null check (amount_egp >= 0),
  expense_date date not null default current_date,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_date_idx
  on public.expenses (expense_date desc);
create index if not exists expenses_category_idx
  on public.expenses (category);

alter table public.expenses enable row level security;

drop policy if exists "expenses service role all" on public.expenses;
create policy "expenses service role all"
  on public.expenses for all
  using (auth.role() = 'service_role' or is_admin_or_owner())
  with check (auth.role() = 'service_role' or is_admin_or_owner());

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

-- -----------------------------------------------------------------------------
-- C) notification_templates (مطلوبة في لوحة الإعدادات)
-- -----------------------------------------------------------------------------
create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email','sms','whatsapp','push')),
  key text not null,
  language text not null default 'en' check (language in ('en','ar')),
  subject text,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel, key, language)
);

create index if not exists notification_templates_lookup_idx
  on public.notification_templates (channel, key, language, is_active);

alter table public.notification_templates enable row level security;

drop policy if exists "notification_templates service role all" on public.notification_templates;
create policy "notification_templates service role all"
  on public.notification_templates for all
  using (auth.role() = 'service_role' or is_admin_or_owner())
  with check (auth.role() = 'service_role' or is_admin_or_owner());

drop policy if exists "notification_templates public read active" on public.notification_templates;
create policy "notification_templates public read active"
  on public.notification_templates for select
  using (is_active = true);

-- -----------------------------------------------------------------------------
-- D) customer_testimonials (مستخدمة في account + API)
-- -----------------------------------------------------------------------------
create table if not exists public.customer_testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  rating int2 not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 10 and 600),
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_testimonials_user_created_idx
  on public.customer_testimonials (user_id, created_at desc);
create index if not exists customer_testimonials_status_created_idx
  on public.customer_testimonials (status, created_at desc);

alter table public.customer_testimonials enable row level security;

drop policy if exists "customer testimonials own select" on public.customer_testimonials;
create policy "customer testimonials own select"
  on public.customer_testimonials for select
  using (
    auth.role() = 'service_role'
    or exists (
      select 1 from public.users u
      where u.id = customer_testimonials.user_id
        and u.clerk_user_id = auth.uid()::text
    )
  );

drop policy if exists "customer testimonials own insert" on public.customer_testimonials;
create policy "customer testimonials own insert"
  on public.customer_testimonials for insert
  with check (
    auth.role() = 'service_role'
    or exists (
      select 1 from public.users u
      where u.id = customer_testimonials.user_id
        and u.clerk_user_id = auth.uid()::text
    )
  );

drop policy if exists "customer testimonials admins moderate" on public.customer_testimonials;
create policy "customer testimonials admins moderate"
  on public.customer_testimonials for all
  using (auth.role() = 'service_role' or is_admin_or_owner())
  with check (auth.role() = 'service_role' or is_admin_or_owner());

-- -----------------------------------------------------------------------------
-- E) compatibility columns for orders (لا تغيّر القيم الحالية إن موجودة)
-- -----------------------------------------------------------------------------
alter table public.orders
  add column if not exists order_code text,
  add column if not exists guest_email text,
  add column if not exists paymob_transaction_id text,
  add column if not exists discount_amount_egp numeric(10,2) not null default 0,
  add column if not exists gift_wrapping_fee_egp numeric(10,2) not null default 0,
  add column if not exists promo_code text,
  add column if not exists delivery_slot text,
  add column if not exists gift_message text,
  add column if not exists is_gift boolean not null default false,
  add column if not exists whatsapp_confirmed boolean not null default false,
  add column if not exists language text not null default 'ar' check (language in ('en','ar')),
  add column if not exists subtotal_egp numeric(10,2),
  add column if not exists delivery_fee_egp numeric(10,2),
  add column if not exists total_egp numeric(10,2),
  add column if not exists shipping_address jsonb,
  add column if not exists paymob_accept_order_id bigint;

-- Backfill من مخطط قديم إلى *_egp إن لزم
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='subtotal'
  ) then
    update public.orders
       set subtotal_egp = coalesce(subtotal_egp, subtotal::numeric(10,2))
     where subtotal_egp is null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='delivery_fee'
  ) then
    update public.orders
       set delivery_fee_egp = coalesce(delivery_fee_egp, delivery_fee::numeric(10,2))
     where delivery_fee_egp is null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='total'
  ) then
    update public.orders
       set total_egp = coalesce(total_egp, total::numeric(10,2))
     where total_egp is null;
  end if;
end$$;

create unique index if not exists orders_order_code_unique_idx
  on public.orders (order_code) where order_code is not null;
create index if not exists orders_guest_email_idx on public.orders (guest_email);
create index if not exists orders_paymob_accept_order_idx
  on public.orders (paymob_accept_order_id)
  where paymob_accept_order_id is not null;

-- -----------------------------------------------------------------------------
-- F) compatibility columns for products المستخدمة في الواجهات
-- -----------------------------------------------------------------------------
alter table public.products
  add column if not exists title_en text,
  add column if not exists title_ar text,
  add column if not exists description_en text,
  add column if not exists description_ar text,
  add column if not exists images jsonb not null default '[]'::jsonb;

update public.products
   set title_en = coalesce(title_en, name),
       title_ar = coalesce(title_ar, name)
 where title_en is null or title_ar is null;

-- -----------------------------------------------------------------------------
-- G) updated_at helpers for new tables
-- -----------------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_gift_boxes_updated on public.gift_boxes;
create trigger trg_gift_boxes_updated
  before update on public.gift_boxes
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_invoices_updated on public.invoices;
create trigger trg_invoices_updated
  before update on public.invoices
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_payments_updated on public.payments;
create trigger trg_payments_updated
  before update on public.payments
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_notification_templates_updated on public.notification_templates;
create trigger trg_notification_templates_updated
  before update on public.notification_templates
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_customer_testimonials_updated_at on public.customer_testimonials;
create trigger trg_customer_testimonials_updated_at
  before update on public.customer_testimonials
  for each row execute function public.tg_set_updated_at();

-- =============================================================================
-- End 0008_schema_alignment_and_security.sql
-- =============================================================================
