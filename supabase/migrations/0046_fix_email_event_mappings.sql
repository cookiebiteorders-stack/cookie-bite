-- Align email event → template keys with notification library (sync-and-map)

insert into public.email_event_template_mappings (event_name, template_key, is_active)
values
  ('user_registered', 'welcome', true),
  ('order_created', 'order-confirmed', true),
  ('order_shipped', 'order-shipped', true),
  ('password_reset', 'password-reset', true)
on conflict (event_name) do update
set template_key = excluded.template_key,
    is_active = excluded.is_active,
    updated_at = now();
