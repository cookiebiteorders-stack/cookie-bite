-- Personalization + behavioral campaign seeds

update public.announcements
set
  title_en = 'Welcome back, {name} 👋',
  title_ar = 'أهلاً بعودتك، {name} 👋',
  message_en = 'Fresh bakes and gift boxes are waiting — see what''s new.',
  message_ar = 'مخبوزات طازجة وعلب هدايا بانتظارك — اطّلع على الجديد.'
where type = 'notification'
  and title_en = 'Welcome back';

insert into public.announcements (
  type, title_en, title_ar, message_en, message_ar,
  cta_label_en, cta_label_ar, cta_url,
  priority, status, target_pages, audience, trigger_config, variant
)
select
  'popup',
  'Still thinking about it?',
  'ما زلت تفكّر؟',
  'Your cart is saved — complete checkout before items sell out.',
  'سلتك محفوظة — أكمل الطلب قبل نفاد الكمية.',
  'Return to cart',
  'العودة للسلة',
  '/cart',
  75,
  'active',
  array['shop', 'product', 'home'],
  '{"userType":"all","behavior":["abandoned_cart"]}'::jsonb,
  '{"type":"event","value":"add_to_cart"}'::jsonb,
  null
where not exists (
  select 1 from public.announcements
  where title_en = 'Still thinking about it?'
);

notify pgrst, 'reload schema';
