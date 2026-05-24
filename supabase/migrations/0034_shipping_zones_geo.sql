-- Map placement for shipping zones (persists across browsers / devices)
alter table public.shipping_zones
  add column if not exists center_lat double precision,
  add column if not exists center_lng double precision,
  add column if not exists radius_km numeric(6,2),
  add column if not exists map_color text;

comment on column public.shipping_zones.center_lat is 'Delivery zone center latitude (WGS84)';
comment on column public.shipping_zones.center_lng is 'Delivery zone center longitude (WGS84)';
comment on column public.shipping_zones.radius_km is 'Delivery radius in kilometres for map circle';
comment on column public.shipping_zones.map_color is 'Hex color for map UI (#RRGGBB)';
