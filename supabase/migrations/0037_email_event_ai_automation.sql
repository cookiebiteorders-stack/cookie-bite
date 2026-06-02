-- Event-driven template-only email automation with AI variable fill logs

alter table public.email_logs
  add column if not exists user_id uuid references public.users(id) on delete set null;

create index if not exists email_logs_user_idx
  on public.email_logs (user_id, created_at desc);

create table if not exists public.email_event_template_mappings (
  id uuid primary key default gen_random_uuid(),
  event_name text not null unique,
  template_key text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_event_template_mappings_event_idx
  on public.email_event_template_mappings (event_name, is_active);

create table if not exists public.email_event_logs (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid references public.users(id) on delete set null,
  recipient text not null,
  template_key text,
  template_id uuid references public.email_templates(id) on delete set null,
  email_log_id uuid references public.email_logs(id) on delete set null,
  status text not null check (status in ('sent','failed','skipped')),
  ai_used boolean not null default false,
  ai_variables jsonb not null default '{}'::jsonb,
  rendered_html_snapshot text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists email_event_logs_created_idx
  on public.email_event_logs (created_at desc);

create index if not exists email_event_logs_event_idx
  on public.email_event_logs (event_name, created_at desc);

insert into public.email_event_template_mappings (event_name, template_key, is_active)
values
  ('user_registered', 'welcome_email', true),
  ('order_created', 'order_confirmation', true),
  ('order_shipped', 'shipping_update', true),
  ('password_reset', 'reset_email', true)
on conflict (event_name) do update
set template_key = excluded.template_key,
    is_active = excluded.is_active,
    updated_at = now();

alter table public.email_event_template_mappings enable row level security;
alter table public.email_event_logs enable row level security;

drop policy if exists "email_event_template_mappings service role all" on public.email_event_template_mappings;
create policy "email_event_template_mappings service role all"
  on public.email_event_template_mappings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "email_event_logs service role all" on public.email_event_logs;
create policy "email_event_logs service role all"
  on public.email_event_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
