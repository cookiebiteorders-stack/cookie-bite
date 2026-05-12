-- Core seed data for local/dev bootstrap.
-- Safe to run multiple times where possible.

insert into public.shipping_zones
  (name, cities, base_fee_egp, free_shipping_threshold_egp, eta_min_days, eta_max_days, is_active, sort_order)
values
  ('Cairo Core', array['Nasr City','Heliopolis','Maadi'], 50, 500, 1, 2, true, 10),
  ('Giza', array['Dokki','Mohandessin','Haram'], 60, 600, 1, 3, true, 20)
on conflict (name) do update
set
  cities = excluded.cities,
  base_fee_egp = excluded.base_fee_egp,
  free_shipping_threshold_egp = excluded.free_shipping_threshold_egp,
  eta_min_days = excluded.eta_min_days,
  eta_max_days = excluded.eta_max_days,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

insert into public.notification_templates
  (channel, key, language, subject, body, is_active)
values
  ('email', 'order_confirmed', 'en', 'Your order is confirmed', 'Hi {{name}}, your order {{order_code}} is confirmed.', true),
  ('email', 'order_confirmed', 'ar', 'تم تأكيد طلبك', 'مرحباً {{name}}، تم تأكيد طلبك {{order_code}}.', true),
  ('push', 'order_status', 'en', null, 'Order {{order_code}} is now {{status}}.', true),
  ('push', 'order_status', 'ar', null, 'طلب {{order_code}} أصبح {{status}}.', true)
on conflict (channel, key, language) do update
set
  subject = excluded.subject,
  body = excluded.body,
  is_active = excluded.is_active,
  updated_at = now();
