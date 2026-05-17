-- Repair drift when 0005_phase_cde_foundations.sql failed mid-run (shipping_zones / notification_templates indexes).

alter table public.shipping_zones
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists shipping_zones_active_idx
  on public.shipping_zones (is_active);

alter table public.notification_templates
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

drop index if exists notification_templates_lookup_idx;
create index if not exists notification_templates_lookup_idx
  on public.notification_templates (channel, key, language, is_active);
