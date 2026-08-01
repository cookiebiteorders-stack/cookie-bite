-- =============================================================================
-- Cookie Bite — Migration 0093: Product Media Link (Canonical DB↔Cloudinary)
-- =============================================================================
-- This migration creates a canonical join between Supabase rows and Cloudinary assets
-- to prevent duplicate URL cascades and cross-pollination across products.
-- =============================================================================

-- 1) New column to mirror the canonical link on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cloudinary_public_id text NULL;

-- 2) Backfill from URL on best-effort basis (preserves a record; do not delete unmatched rows)
UPDATE public.products p
SET cloudinary_public_id = regexp_replace(
       p.image_url,
       '^https?://res\.cloudinary\.com/[^/]+/(?:image|video)/upload/(?:v\d+/)?(.+?)(?:\.[a-z0-9]+)?$',
       '\1'
     )
WHERE p.cloudinary_public_id IS NULL
  AND p.image_url IS NOT NULL
  AND p.image_url LIKE 'https://res.cloudinary.com/%';

-- 3) Same on variants and gift boxes
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS cloudinary_public_id text NULL;

UPDATE public.product_variants pv
SET cloudinary_public_id = regexp_replace(
       pv.image_url,
       '^https?://res\.cloudinary\.com/[^/]+/(?:image|video)/upload/(?:v\d+/)?(.+?)(?:\.[a-z0-9]+)?$',
       '\1'
     )
WHERE pv.cloudinary_public_id IS NULL
  AND pv.image_url IS NOT NULL
  AND pv.image_url LIKE 'https://res.cloudinary.com/%';

ALTER TABLE public.gift_box_sizes
  ADD COLUMN IF NOT EXISTS cloudinary_public_id text NULL;

UPDATE public.gift_box_sizes gbs
SET cloudinary_public_id = regexp_replace(
       gbs.image_url,
       '^https?://res\.cloudinary\.com/[^/]+/(?:image|video)/upload/(?:v\d+/)?(.+?)(?:\.[a-z0-9]+)?$',
       '\1'
     )
WHERE gbs.cloudinary_public_id IS NULL
  AND gbs.image_url IS NOT NULL
  AND gbs.image_url LIKE 'https://res.cloudinary.com/%';

-- 4) Canonical product-media join (used for replace/rename/delete cascades)
CREATE TABLE IF NOT EXISTS public.product_media (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  public_id    text NOT NULL,
  url          text NOT NULL,
  role         text NOT NULL CHECK (role IN ('primary','gallery','video')),
  sort_order   int  NOT NULL DEFAULT 0,
  alt_en       text NULL,
  alt_ar       text NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (public_id, role),
  UNIQUE (product_id, public_id)
);

CREATE INDEX IF NOT EXISTS product_media_by_public_id
  ON public.product_media (public_id);

CREATE INDEX IF NOT EXISTS product_media_by_product_id
  ON public.product_media (product_id);

-- 5) Enable RLS consistent with the products table
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;

-- Public can read alongside products (RLS already allows SELECT on products to anon for active listings)
DROP POLICY IF EXISTS "anon read gallery" ON public.product_media;
CREATE POLICY "anon read gallery" ON public.product_media
  FOR SELECT USING (true);

-- Admins CRUD
DROP POLICY IF EXISTS "admin write gallery" ON public.product_media;
CREATE POLICY "admin write gallery" ON public.product_media
  FOR ALL USING (
    public.is_admin_or_owner()
  );

-- 6) Add comments
COMMENT ON COLUMN public.products.cloudinary_public_id IS 'Canonical Cloudinary public_id for the primary image';
COMMENT ON COLUMN public.product_variants.cloudinary_public_id IS 'Canonical Cloudinary public_id for variant image';
COMMENT ON COLUMN public.gift_box_sizes.cloudinary_public_id IS 'Canonical Cloudinary public_id for gift box image';
COMMENT ON TABLE public.product_media IS 'Canonical join table linking products to Cloudinary assets with proper foreign key constraints';
