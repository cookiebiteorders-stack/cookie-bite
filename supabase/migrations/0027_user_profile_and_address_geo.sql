-- Customer profile (post sign-up) + GPS on addresses
alter table public.users
  add column if not exists full_name_en text,
  add column if not exists full_name_ar text,
  add column if not exists phone text,
  add column if not exists phone_secondary text,
  add column if not exists profile_notes text,
  add column if not exists profile_completed_at timestamptz;

alter table public.addresses
  add column if not exists phone_secondary text,
  add column if not exists building text,
  add column if not exists floor text,
  add column if not exists apartment text,
  add column if not exists delivery_notes text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create index if not exists users_profile_incomplete_idx
  on public.users (profile_completed_at)
  where profile_completed_at is null;
