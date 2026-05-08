-- =============================================================================
-- Cookie Bite — هيكل قاعدة البيانات الأساسي
-- ينفذ على مشروع Supabase: cgjrrpbknhwzppnpkojx
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1) المستخدمون (مرتبطون بـ Clerk عبر clerk_user_id)
-- ----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text not null default 'customer'
    check (role in ('owner','admin','staff','customer')),
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (lower(email));
create index if not exists users_role_idx on public.users (role);

-- ----------------------------------------------------------------------------
-- 2) المنتجات
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  price_egp numeric(10,2) not null check (price_egp >= 0),
  category text,
  image_url text,
  badges text[] default '{}',
  is_active boolean not null default true,
  stock integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_idx on public.products (is_active);
create index if not exists products_category_idx on public.products (category);

-- ----------------------------------------------------------------------------
-- 3) العناوين
-- ----------------------------------------------------------------------------
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text,
  recipient text not null,
  phone text not null,
  street text not null,
  city text not null,
  governorate text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists addresses_user_idx on public.addresses (user_id);

-- ----------------------------------------------------------------------------
-- 4) الطلبات + بنود الطلب
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number serial unique,
  user_id uuid references public.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','processing','shipped','delivered','cancelled','refunded')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','refunded','failed')),
  payment_method text,
  subtotal_egp numeric(10,2) not null default 0,
  delivery_fee_egp numeric(10,2) not null default 0,
  total_egp numeric(10,2) not null default 0,
  notes text,
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price_egp numeric(10,2) not null check (unit_price_egp >= 0),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ----------------------------------------------------------------------------
-- 5) رسائل التواصل + اشتراكات النشرة
-- ----------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text default 'site',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6) Trigger تحديث updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_users_updated on public.users;
create trigger trg_users_updated before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7) RLS — التطبيق يستخدم service-key في السيرفر، لكن نُفعّل RLS كطبقة دفاع
-- ----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- المنتجات النشطة قابلة للقراءة من أي شخص (anon)
drop policy if exists "products are public read" on public.products;
create policy "products are public read"
  on public.products for select
  using (is_active);

-- بقية الجداول لا تتيح أي وصول من anon — كل شيء عبر service-role.
