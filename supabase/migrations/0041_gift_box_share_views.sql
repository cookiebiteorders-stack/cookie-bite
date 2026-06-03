-- Feature 5: gift box share link — view counter on gift_boxes

alter table public.gift_boxes
  add column if not exists view_count int not null default 0;

create index if not exists gift_boxes_view_count_idx on public.gift_boxes (view_count desc)
  where is_active = true;
