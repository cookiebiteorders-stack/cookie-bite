-- Idempotent staff alert tracking (owner/admin emails on new customers)
alter table public.users
  add column if not exists staff_signup_alert_sent_at timestamptz,
  add column if not exists staff_profile_alert_sent_at timestamptz;

comment on column public.users.staff_signup_alert_sent_at is
  'When owner/admin were emailed about this customer signing up (Clerk user.created).';
comment on column public.users.staff_profile_alert_sent_at is
  'When owner/admin were emailed with full profile + default address after completion.';

alter table public.orders
  add column if not exists staff_alert_sent_at timestamptz;

comment on column public.orders.staff_alert_sent_at is
  'When owner/admin were emailed about this new order.';
