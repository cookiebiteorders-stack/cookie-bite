-- Idempotent welcome email tracking (Clerk webhook + account-page fallback)
alter table public.users
  add column if not exists welcome_email_sent_at timestamptz;

comment on column public.users.welcome_email_sent_at is
  'Set when the Cookie Bite welcome transactional email was sent via Resend.';
