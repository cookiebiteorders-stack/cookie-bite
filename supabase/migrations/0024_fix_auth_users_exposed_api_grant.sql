-- Supabase advisor: auth_users_exposed
-- Views (or matviews) that reference auth.users must not be readable by PostgREST roles.
-- Applied via Management API: npm run supabase:migrate

-- 1) Regular / standard views (information_schema)
do $$
declare
  r record;
begin
  for r in
    select distinct v.view_schema as sch, v.view_name as rel
    from information_schema.view_table_usage v
    where v.table_schema = 'auth'
      and v.table_name = 'users'
      and v.view_schema in ('public', 'graphql_public')
  loop
    execute format(
      'revoke all privileges on table %I.%I from anon, authenticated, public',
      r.sch,
      r.rel
    );
  end loop;
end;
$$;

-- 2) Materialized views whose definition references auth.users
do $$
declare
  r record;
begin
  for r in
    select m.schemaname as sch, m.matviewname as rel
    from pg_matviews m
    where m.schemaname in ('public', 'graphql_public')
      and m.definition ilike '%auth.users%'
  loop
    execute format(
      'revoke all privileges on table %I.%I from anon, authenticated, public',
      r.sch,
      r.rel
    );
  end loop;
end;
$$;
