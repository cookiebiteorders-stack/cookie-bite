-- Quick security/health checks for Supabase public schema.
-- Run with scripts/supabase-inspect-schema.mjs or Supabase SQL editor.

-- 1) Tables with RLS disabled (should be empty)
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and rowsecurity = false
order by tablename;

-- 2) Public tables that have zero policies (needs review)
select t.tablename
from pg_tables t
left join pg_policies p
  on p.schemaname = 'public'
 and p.tablename = t.tablename
where t.schemaname = 'public'
group by t.tablename
having count(p.policyname) = 0
order by t.tablename;

-- 3) SECURITY DEFINER functions without explicit search_path
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
  and (p.proconfig is null or not exists (
    select 1 from unnest(p.proconfig) c where c like 'search_path=%'
  ))
order by p.proname;

-- 4) Core app tables presence
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'users','products','orders','order_items','wishlists','promo_codes',
    'shipping_zones','gift_boxes','payments','invoices',
    'notification_templates','customer_testimonials','expenses'
  )
order by table_name;
