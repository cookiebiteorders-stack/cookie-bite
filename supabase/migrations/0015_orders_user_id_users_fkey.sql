-- ============================================================================
-- Cookie Bite — FK orders.user_id → users.id إن وُجد العمود ولم يكن مرتبطاً بعد
-- يقلل أخطاء PostgREST المرتبطة بعدم رؤية علاقة user_id في schema cache
-- ============================================================================

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_schema = kcu.constraint_schema
     and tc.constraint_name = kcu.constraint_name
    where tc.table_schema = 'public'
      and tc.table_name = 'orders'
      and kcu.column_name = 'user_id'
      and tc.constraint_type = 'FOREIGN KEY'
  ) then
    null;
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'user_id'
  ) then
    null;
  elsif not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'users'
  ) then
    null;
  else
    alter table public.orders
      add constraint orders_user_id_fkey
      foreign key (user_id) references public.users(id) on delete set null;
  end if;
exception
  when duplicate_object then
    null;
end $$;
