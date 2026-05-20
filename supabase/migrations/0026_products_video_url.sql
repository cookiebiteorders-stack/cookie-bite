-- Product PDP: optional showcase video (Cloudinary URL)
alter table public.products
  add column if not exists video_url text;

comment on column public.products.video_url is
  'Optional product video URL (e.g. Cloudinary) shown in PDP media gallery.';
