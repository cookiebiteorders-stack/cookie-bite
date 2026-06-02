-- Feature 1: scheduled delivery, gift recipient, time slots

alter table public.orders
  add column if not exists scheduled_delivery_date date,
  add column if not exists scheduled_delivery_time time,
  add column if not exists delivery_slot_id uuid,
  add column if not exists recipient_name text,
  add column if not exists recipient_phone text,
  add column if not exists recipient_address jsonb,
  add column if not exists hide_price boolean not null default false,
  add column if not exists anonymous_sender boolean not null default false,
  add column if not exists sender_name text;

create table if not exists public.delivery_time_slots (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  label_ar text,
  start_time time not null,
  end_time time not null,
  max_orders_per_slot int not null default 20,
  is_active boolean not null default true,
  available_days int[] not null default '{0,1,2,3,4,5,6}',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.slot_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.delivery_time_slots(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  delivery_date date not null,
  created_at timestamptz not null default now(),
  unique (slot_id, order_id)
);

create index if not exists idx_slot_bookings_slot_date
  on public.slot_bookings (slot_id, delivery_date);

create index if not exists idx_orders_scheduled_delivery_date
  on public.orders (scheduled_delivery_date);

insert into public.delivery_time_slots (label, label_ar, start_time, end_time, sort_order)
select v.label, v.label_ar, v.start_time::time, v.end_time::time, v.sort_order
from (
  values
    ('Morning 9:00 – 12:00', 'صباحاً 9:00 – 12:00', '09:00', '12:00', 1),
    ('Midday 12:00 – 3:00', 'ظهراً 12:00 – 3:00', '12:00', '15:00', 2),
    ('Afternoon 3:00 – 6:00', 'عصراً 3:00 – 6:00', '15:00', '18:00', 3),
    ('Evening 6:00 – 9:00', 'مساءً 6:00 – 9:00', '18:00', '21:00', 4)
) as v(label, label_ar, start_time, end_time, sort_order)
where not exists (select 1 from public.delivery_time_slots limit 1);
