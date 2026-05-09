-- =============================================================================
-- Cookie Bite — Migration 0003: تمديد المخطط (v2)
-- آمنة: ALTER TABLE فقط على الجداول الموجودة + إنشاء جداول جديدة + دوال + فهارس
-- لا تعيد تسمية أي جدول/عمود لتفادي كسر الكود الحالي.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- A) أعمدة ثنائية اللغة وصور JSONB على products
-- ----------------------------------------------------------------------------
alter table public.products
  add column if not exists sanity_id          text unique,
  add column if not exists title_en           text,
  add column if not exists title_ar           text,
  add column if not exists description_en     text,
  add column if not exists description_ar     text,
  add column if not exists compare_price_egp  numeric(10,2),
  add column if not exists sku                text,
  add column if not exists images             jsonb not null default '[]'::jsonb,
  add column if not exists dietary            text[] not null default '{}',
  add column if not exists seasons            text[] not null default '{}',
  add column if not exists weight_grams       integer,
  add column if not exists pieces_count       integer;

-- جعل sku فريد إن وُجد
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='products_sku_unique_idx'
  ) then
    create unique index products_sku_unique_idx on public.products (sku) where sku is not null;
  end if;
end$$;

-- نسخ name → title_en و title_ar مرة واحدة (إن كانا فارغين)
update public.products
set title_en = coalesce(title_en, name),
    title_ar = coalesce(title_ar, name)
where (title_en is null or title_ar is null);

-- ----------------------------------------------------------------------------
-- B) أعمدة جديدة على orders
-- ----------------------------------------------------------------------------
alter table public.orders
  add column if not exists order_code           text,
  add column if not exists guest_email          text,
  add column if not exists paymob_transaction_id text,
  add column if not exists discount_amount_egp  numeric(10,2) not null default 0,
  add column if not exists gift_wrapping_fee_egp numeric(10,2) not null default 0,
  add column if not exists promo_code           text,
  add column if not exists delivery_slot        text,
  add column if not exists gift_message         text,
  add column if not exists is_gift              boolean not null default false,
  add column if not exists whatsapp_confirmed   boolean not null default false,
  add column if not exists language             text not null default 'ar' check (language in ('en','ar'));

create unique index if not exists orders_order_code_unique_idx
  on public.orders (order_code) where order_code is not null;

create index if not exists orders_guest_email_idx on public.orders (guest_email);

-- ----------------------------------------------------------------------------
-- C) أعمدة جديدة على order_items
-- ----------------------------------------------------------------------------
alter table public.order_items
  add column if not exists product_snapshot jsonb,
  add column if not exists total_price_egp  numeric(10,2);

-- ----------------------------------------------------------------------------
-- D) Promo codes
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.promo_type as enum ('percent','fixed');
exception when duplicate_object then null; end $$;

create table if not exists public.promo_codes (
  id                       uuid primary key default gen_random_uuid(),
  code                     text unique not null,
  type                     public.promo_type not null,
  value                    numeric(10,2) not null check (value > 0),
  min_order_amount_egp     numeric(10,2) not null default 0,
  max_uses                 integer,
  used_count               integer not null default 0,
  max_uses_per_user        integer not null default 1,
  applicable_product_ids   uuid[] not null default '{}',
  is_active                boolean not null default true,
  valid_from               timestamptz not null default now(),
  valid_until              timestamptz,
  created_at               timestamptz not null default now()
);

create table if not exists public.promo_code_uses (
  id            uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id       uuid references public.users(id) on delete set null,
  order_id      uuid references public.orders(id) on delete cascade,
  used_at       timestamptz not null default now()
);

create index if not exists promo_code_uses_user_idx  on public.promo_code_uses (user_id);
create index if not exists promo_code_uses_promo_idx on public.promo_code_uses (promo_code_id);

alter table public.promo_codes      enable row level security;
alter table public.promo_code_uses  enable row level security;

drop policy if exists "anyone reads active promos" on public.promo_codes;
create policy "anyone reads active promos"
  on public.promo_codes for select
  using (is_active = true);

-- ----------------------------------------------------------------------------
-- E) Wishlists
-- ----------------------------------------------------------------------------
create table if not exists public.wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists wishlists_user_idx on public.wishlists (user_id);

alter table public.wishlists enable row level security;

drop policy if exists "users manage own wishlist" on public.wishlists;
create policy "users manage own wishlist"
  on public.wishlists for all
  using (
    user_id = (select id from public.users where clerk_user_id = auth.jwt()->>'sub')
  );

-- ----------------------------------------------------------------------------
-- F) Reviews
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid references public.users(id) on delete set null,
  order_id    uuid references public.orders(id) on delete set null,
  rating      integer not null check (rating between 1 and 5),
  body        text,
  is_approved boolean not null default false,
  is_featured boolean not null default false,
  created_at  timestamptz not null default now()
);

-- في بعض قواعد البيانات القديمة كان العمود product_slug موجودًا بدل product_id.
-- نضيف product_id بشكل متوافق مع الإصدار الحالي إن لم يكن موجودًا.
alter table public.reviews
  add column if not exists product_id uuid references public.products(id) on delete cascade;

alter table public.reviews
  add column if not exists is_approved boolean not null default false,
  add column if not exists is_featured boolean not null default false;

-- محاولة تعبئة product_id من slug إن كانت البيانات القديمة تعتمد product_slug.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='reviews' and column_name='product_slug'
  ) then
    update public.reviews r
    set product_id = p.id
    from public.products p
    where r.product_id is null
      and r.product_slug = p.slug;
  end if;
end$$;

create index if not exists reviews_product_idx on public.reviews (product_id);

alter table public.reviews enable row level security;

drop policy if exists "anyone reads approved reviews" on public.reviews;
create policy "anyone reads approved reviews"
  on public.reviews for select
  using (is_approved = true);

-- ----------------------------------------------------------------------------
-- G) Push subscriptions
-- ----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete cascade,
  endpoint   text unique not null,
  p256dh     text not null,
  auth_key   text not null,
  platform   text check (platform in ('android','ios','desktop')),
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "users manage own subscriptions" on public.push_subscriptions;
create policy "users manage own subscriptions"
  on public.push_subscriptions for all
  using (
    user_id = (select id from public.users where clerk_user_id = auth.jwt()->>'sub')
  );

-- ----------------------------------------------------------------------------
-- H) Loyalty (مبدئي — Phase 2)
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.loyalty_tier as enum ('cookie_lover','cruncher','cookie_monster');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.loyalty_txn_type as enum ('earned','redeemed','bonus','expired');
exception when duplicate_object then null; end $$;

create table if not exists public.loyalty_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references public.users(id) on delete cascade,
  total_points    integer not null default 0,
  lifetime_points integer not null default 0,
  tier            public.loyalty_tier not null default 'cookie_lover',
  referral_code   text unique,
  referred_by     uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists public.loyalty_transactions (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references public.loyalty_accounts(id) on delete cascade,
  type           public.loyalty_txn_type not null,
  points         integer not null,
  description_en text,
  description_ar text,
  order_id       uuid references public.orders(id) on delete set null,
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);

alter table public.loyalty_accounts     enable row level security;
alter table public.loyalty_transactions enable row level security;

-- ----------------------------------------------------------------------------
-- I) دوال مساعدة
-- ----------------------------------------------------------------------------

-- خصم آمن من المخزون
create or replace function public.decrement_product_stock(p_id uuid, qty integer)
returns void language plpgsql as $$
begin
  update public.products set stock = stock - qty
  where id = p_id and stock >= qty;
  if not found then
    raise exception 'Insufficient stock for product %', p_id;
  end if;
end$$;

-- زيادة نقاط الولاء
create or replace function public.add_loyalty_points(p_user uuid, pts integer)
returns void language plpgsql as $$
begin
  update public.loyalty_accounts
     set total_points    = total_points + pts,
         lifetime_points = lifetime_points + pts,
         tier = case
           when total_points + pts >= 1000 then 'cookie_monster'::public.loyalty_tier
           when total_points + pts >= 500  then 'cruncher'::public.loyalty_tier
           else 'cookie_lover'::public.loyalty_tier
         end
   where user_id = p_user;
end$$;

-- توليد order_code بصيغة CB-YYYYMMDD-NNNN لكل طلب جديد
create or replace function public.set_order_code()
returns trigger language plpgsql as $$
declare
  daily_count int;
begin
  if new.order_code is null then
    select count(*) + 1 into daily_count
      from public.orders
     where date(created_at) = current_date;
    new.order_code := 'CB-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(daily_count::text, 4, '0');
  end if;
  return new;
end$$;

drop trigger if exists trg_orders_order_code on public.orders;
create trigger trg_orders_order_code
  before insert on public.orders
  for each row execute function public.set_order_code();

-- ----------------------------------------------------------------------------
-- J) Search vector + trigger
-- ----------------------------------------------------------------------------
alter table public.products
  add column if not exists search_vector tsvector;

create index if not exists products_search_idx on public.products using gin (search_vector);

create or replace function public.update_product_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector := to_tsvector('simple',
    coalesce(new.title_en,'')      || ' ' ||
    coalesce(new.title_ar,'')      || ' ' ||
    coalesce(new.name,'')          || ' ' ||
    coalesce(new.description_en,'')|| ' ' ||
    coalesce(new.description_ar,'')|| ' ' ||
    coalesce(new.description,'')
  );
  return new;
end$$;

drop trigger if exists trg_products_search on public.products;
create trigger trg_products_search
  before insert or update on public.products
  for each row execute function public.update_product_search_vector();

-- لتعبئة الموجود
update public.products set search_vector = to_tsvector('simple',
  coalesce(title_en,'')      || ' ' ||
  coalesce(title_ar,'')      || ' ' ||
  coalesce(name,'')          || ' ' ||
  coalesce(description_en,'')|| ' ' ||
  coalesce(description_ar,'')|| ' ' ||
  coalesce(description,'')
);

-- ----------------------------------------------------------------------------
-- K) فهارس مفقودة
-- ----------------------------------------------------------------------------
create index if not exists products_seasons_idx on public.products using gin (seasons);
create index if not exists products_dietary_idx on public.products using gin (dietary);
create index if not exists products_badges_idx  on public.products using gin (badges);

-- =============================================================================
-- نهاية 0003_v2_extend_schema.sql
-- =============================================================================
