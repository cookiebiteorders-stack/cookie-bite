-- =============================================================================
-- Cookie Bite — Migration 0073: Supabase Auth (إزالة اعتماد Clerk على users)
-- =============================================================================

-- 1) clerk_user_id اختياري — المعرّف الأساسي = auth.users.id = public.users.id
alter table public.users
  alter column clerk_user_id drop not null;

-- 2) إنشاء/تحديث صف المستخدم عند التسجيل في Supabase Auth
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_role text;
begin
  v_email := lower(trim(coalesce(NEW.email, '')));
  if v_email = '' then
    return NEW;
  end if;

  v_role := case
    when v_email = lower(trim(coalesce(current_setting('app.owner_bootstrap_email', true), 'cookie.bite.orders@gmail.com')))
      then 'owner'
    else 'customer'
  end;

  insert into public.users (
    id,
    email,
    full_name,
    avatar_url,
    role
  )
  values (
    NEW.id,
    v_email,
    coalesce(
      nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(NEW.raw_user_meta_data->>'name'), '')
    ),
    nullif(trim(NEW.raw_user_meta_data->>'avatar_url'), ''),
    v_role
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
    updated_at = now();

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 3) RLS — auth.uid() = public.users.id (Supabase Auth)
drop policy if exists "wishlist_shares owner read" on public.wishlist_shares;
create policy "wishlist_shares owner read"
  on public.wishlist_shares for select
  using (
    auth.role() = 'service_role'
    or user_id = auth.uid()
  );

drop policy if exists "wishlist_shares owner write" on public.wishlist_shares;
create policy "wishlist_shares owner write"
  on public.wishlist_shares for all
  using (
    auth.role() = 'service_role'
    or user_id = auth.uid()
  )
  with check (
    auth.role() = 'service_role'
    or user_id = auth.uid()
  );

-- testimonials (0006) — إن وُجدت السياسة القديمة
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_testimonials'
      and policyname = 'customer_testimonials owner insert'
  ) then
    execute 'drop policy "customer_testimonials owner insert" on public.customer_testimonials';
    execute $p$
      create policy "customer_testimonials owner insert"
        on public.customer_testimonials for insert
        with check (
          auth.role() = ''service_role''
          or user_id = auth.uid()
        )
    $p$;
  end if;
end$$;
