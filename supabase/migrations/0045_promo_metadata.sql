-- Promo campaign metadata (rules, kind, free shipping, tags)
alter table public.promo_codes
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.promo_codes.metadata is
  'Campaign extras: kind, campaign_tag, rules { mode, keys }, free_shipping, notes';
