-- Enterprise email automation: queue, logs, providers, health, templates

create table if not exists public.email_provider_settings (
  id uuid primary key default gen_random_uuid(),
  active_provider text not null default 'resend',
  provider_priority text[] not null default array['resend','smtp']::text[],
  auto_fallback_enabled boolean not null default true,
  self_heal_enabled boolean not null default true,
  test_recipient text,
  rate_limit_per_minute int not null default 60,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.email_provider_settings (id)
select gen_random_uuid()
where not exists (select 1 from public.email_provider_settings limit 1);

create table if not exists public.smtp_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider_type text not null default 'smtp'
    check (provider_type in ('smtp','gmail','outlook','sendgrid','mailgun','ses','resend')),
  host text,
  port int default 587,
  secure boolean not null default false,
  username text,
  password_encrypted text,
  from_email text not null,
  from_name text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  last_verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  name text not null,
  category text not null default 'transactional'
    check (category in ('transactional','marketing','otp','invoice','notification','system')),
  subject text not null,
  html_body text not null,
  text_body text,
  variables jsonb not null default '[]'::jsonb,
  language text not null default 'en' check (language in ('en','ar')),
  is_active boolean not null default true,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, language)
);

create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending','processing','sent','failed','cancelled')),
  priority int not null default 5,
  email_type text not null default 'transactional',
  template_key text,
  recipient text not null,
  subject text not null,
  html_body text not null,
  text_body text,
  variables jsonb not null default '{}'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  provider text,
  provider_message_id text,
  attempts int not null default 0,
  max_attempts int not null default 5,
  scheduled_at timestamptz not null default now(),
  next_retry_at timestamptz,
  sent_at timestamptz,
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_queue_status_scheduled_idx
  on public.email_queue (status, scheduled_at)
  where status in ('pending','failed');

create index if not exists email_queue_recipient_idx
  on public.email_queue (recipient, created_at desc);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.email_queue(id) on delete set null,
  recipient text not null,
  subject text not null,
  email_type text not null default 'transactional',
  template_key text,
  provider text not null,
  provider_message_id text,
  status text not null check (status in ('sent','delivered','bounced','complained','failed')),
  opened_at timestamptz,
  clicked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists email_logs_created_idx
  on public.email_logs (created_at desc);

create index if not exists email_logs_recipient_idx
  on public.email_logs (recipient, created_at desc);

create table if not exists public.failed_emails (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.email_queue(id) on delete set null,
  recipient text not null,
  subject text not null,
  provider text,
  error_code text,
  error_message text not null,
  retry_count int not null default 0,
  max_retries int not null default 5,
  next_retry_at timestamptz,
  resolved_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists failed_emails_retry_idx
  on public.failed_emails (next_retry_at)
  where resolved_at is null;

create table if not exists public.provider_health_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  status text not null check (status in ('healthy','degraded','down')),
  latency_ms int,
  dns_ok boolean,
  spf_ok boolean,
  dkim_ok boolean,
  dmarc_ok boolean,
  rate_limited boolean not null default false,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create index if not exists provider_health_provider_checked_idx
  on public.provider_health_logs (provider, checked_at desc);

alter table public.email_provider_settings enable row level security;
alter table public.smtp_configs enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_queue enable row level security;
alter table public.email_logs enable row level security;
alter table public.failed_emails enable row level security;
alter table public.provider_health_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'email_provider_settings','smtp_configs','email_templates','email_queue',
    'email_logs','failed_emails','provider_health_logs'
  ] loop
    execute format('drop policy if exists "%s service role all" on public.%I', t, t);
    execute format(
      'create policy "%s service role all" on public.%I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')',
      t, t
    );
  end loop;
end $$;
