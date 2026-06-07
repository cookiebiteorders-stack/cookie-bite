-- =============================================================================
-- Cookie Bite — Migration 0061: Product catalog Phase 2
-- categories, tags, collections, variants, barcode, SEO meta
-- =============================================================================

alter table public.products
  add column if not exists barcode text,
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists category_id uuid;

create unique index if not exists products_barcode_unique_idx
  on public.products (barcode) where barcode is not null;

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_ar text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_tags (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_ar text,
  created_at timestamptz not null default now()
);

create table if not exists public.product_tag_links (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id uuid not null references public.product_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, tag_id)
);

create table if not exists public.product_collections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_ar text,
  description_en text,
  description_ar text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_collection_items (
  collection_id uuid not null references public.product_collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, product_id)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text,
  barcode text,
  price_egp numeric(10,2) check (price_egp is null or price_egp > 0),
  stock integer not null default 0 check (stock >= 0),
  options jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_category_id_fkey'
  ) then
    alter table public.products
      add constraint products_category_id_fkey
      foreign key (category_id) references public.product_categories(id) on delete set null;
  end if;
end $$;

create index if not exists idx_product_variants_product_id on public.product_variants(product_id);
create unique index if not exists product_variants_sku_unique_idx
  on public.product_variants (sku) where sku is not null;
create unique index if not exists product_variants_barcode_unique_idx
  on public.product_variants (barcode) where barcode is not null;
create index if not exists idx_product_tag_links_product on public.product_tag_links(product_id);
create index if not exists idx_product_tag_links_tag on public.product_tag_links(tag_id);
create index if not exists idx_product_collection_items_collection on public.product_collection_items(collection_id);
create index if not exists idx_product_collection_items_product on public.product_collection_items(product_id);

-- Seed default categories (matches lib/admin/product-categories.ts)
insert into public.product_categories (slug, name_en, name_ar, sort_order)
values
  ('classic', 'Classic', 'كلاسيك', 1),
  ('chocolate-lovers', 'Chocolate Lovers', 'عشاق الشوكولاتة', 2),
  ('stuffed', 'Stuffed', 'محشوة', 3),
  ('premium', 'Premium', 'فاخرة', 4),
  ('seasonal', 'Seasonal', 'موسمية', 5),
  ('gifts', 'Gifts', 'هدايا ومناسبات', 6),
  ('gift-box', 'Gift Box', 'بوكس هدايا', 7),
  ('bites-and-more', 'Bites & More', 'قضمات وأكثر', 8)
on conflict (slug) do nothing;

-- Link legacy text category → category_id where possible
update public.products p
set category_id = c.id
from public.product_categories c
where p.category_id is null
  and p.category is not null
  and lower(trim(p.category)) = lower(trim(c.name_en));

alter table public.product_categories enable row level security;
alter table public.product_tags enable row level security;
alter table public.product_tag_links enable row level security;
alter table public.product_collections enable row level security;
alter table public.product_collection_items enable row level security;
alter table public.product_variants enable row level security;

notify pgrst, 'reload schema';
