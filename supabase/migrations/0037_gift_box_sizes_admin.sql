create table if not exists public.gift_box_sizes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  max_items int not null check (max_items > 0),
  image_url text null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.gift_box_sizes (code, name, max_items, image_url, is_active, sort_order)
values
  ('small', 'Small', 6, '/brand/gift-box/box-closed-ref.png', true, 10),
  ('medium', 'Medium', 12, '/brand/gift-box/box-closed-ref.png', true, 20),
  ('large', 'Large', 24, '/brand/gift-box/box-closed-ref.png', true, 30)
on conflict (code) do nothing;
