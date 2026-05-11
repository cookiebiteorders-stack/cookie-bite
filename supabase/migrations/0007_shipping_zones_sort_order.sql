-- ترتيب عرض مناطق الشحن (سحب وإفلات في لوحة الإدارة)
alter table public.shipping_zones
  add column if not exists sort_order integer not null default 0;

with ordered as (
  select
    id,
    (row_number() over (order by created_at asc)) * 10 as rn
  from public.shipping_zones
)
update public.shipping_zones z
set sort_order = ordered.rn
from ordered
where z.id = ordered.id;

create index if not exists shipping_zones_sort_order_idx
  on public.shipping_zones (sort_order, created_at);
