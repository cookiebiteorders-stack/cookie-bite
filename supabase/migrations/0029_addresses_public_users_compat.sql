-- Fix addresses FK (was auth.users) + app columns recipient/city for profile/checkout
alter table public.addresses
  drop constraint if exists addresses_user_id_fkey;

alter table public.addresses
  add constraint addresses_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.addresses
  add column if not exists recipient text,
  add column if not exists city text;

-- Backfill from legacy Egypt schema (full_name / area)
update public.addresses
set recipient = coalesce(nullif(trim(recipient), ''), nullif(trim(full_name), ''))
where (recipient is null or trim(recipient) = '')
  and full_name is not null
  and trim(full_name) <> '';

update public.addresses
set city = coalesce(nullif(trim(city), ''), nullif(trim(area), ''))
where (city is null or trim(city) = '')
  and area is not null
  and trim(area) <> '';

-- Relax building when legacy rows used empty string; app sends '-' when omitted
alter table public.addresses
  alter column building drop not null;

alter table public.addresses
  alter column building set default '';
