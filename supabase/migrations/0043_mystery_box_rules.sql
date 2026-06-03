-- Feature 7: Mystery box — rules per occasion + budget (EGP)

create table if not exists public.mystery_box_rules (
  id uuid primary key default gen_random_uuid(),
  occasion text not null,
  budget_min numeric(10, 2) not null,
  budget_max numeric(10, 2) not null,
  product_categories text[] default '{}',
  min_items int not null default 3 check (min_items >= 1),
  max_items int not null default 8 check (max_items >= min_items),
  description_ar text,
  description_en text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (budget_max >= budget_min)
);

create index if not exists idx_mystery_box_rules_occasion on public.mystery_box_rules (occasion, is_active)
  where is_active = true;

alter table public.mystery_box_rules enable row level security;

drop policy if exists mystery_box_rules_public_read on public.mystery_box_rules;
create policy mystery_box_rules_public_read on public.mystery_box_rules
  for select using (is_active = true);

insert into public.mystery_box_rules (
  occasion, budget_min, budget_max, min_items, max_items, description_ar, description_en, sort_order
) values
  ('birthday', 300, 550, 4, 6, 'تشكيلة احتفالية مميزة لعيد الميلاد', 'A festive birthday cookie mix', 10),
  ('birthday', 550, 1000, 6, 10, 'صندوق فاخر لعيد الميلاد', 'Premium birthday gift box', 20),
  ('ramadan', 400, 900, 5, 8, 'تشكيلة رمضانية بنكهات خاصة', 'Ramadan treats selection', 30),
  ('thanks', 250, 500, 3, 5, 'هدية شكر أنيقة', 'Elegant thank-you gift', 40),
  ('corporate', 900, 2000, 8, 15, 'صندوق هدايا للشركات', 'Corporate gifting box', 50),
  ('wedding', 600, 1500, 6, 10, 'تشكيلة احتفال زواج', 'Wedding celebration box', 60);
