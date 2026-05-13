-- سياسات RLS لـ chat_messages: الوصول الإداري + service role؛ قراءة المستخدم لصفوفه فقط عند استخدام عميل JWT

drop policy if exists "chat_messages service role all" on public.chat_messages;
create policy "chat_messages service role all"
  on public.chat_messages for all
  using (auth.role() = 'service_role' or is_admin_or_owner())
  with check (auth.role() = 'service_role' or is_admin_or_owner());

drop policy if exists "chat_messages user read own" on public.chat_messages;
create policy "chat_messages user read own"
  on public.chat_messages for select
  using (auth.uid() is not null and user_id = auth.uid());

comment on table public.chat_messages is
  'Chat persistence; writes عبر API (service role). المستخدم المُصدق يقرأ صفوف user_id = auth.uid() فقط.';
