-- =============================================================================
-- Cookie Bite — Migration 0094: Products Image Invariants
-- =============================================================================
-- This migration adds DB constraints to keep image_url and images in sync
-- and prevents drift between the denormalized image_url and images array.
-- =============================================================================

-- 1) Create trigger function to auto-maintain image_url when images is updated
CREATE OR REPLACE FUNCTION public.products_sync_image_url()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.image_url IS NULL AND NEW.images IS NOT NULL
     AND jsonb_array_length(NEW.images) > 0 THEN
    NEW.image_url := (NEW.images->0->>'url');
  END IF;
  RETURN NEW;
END $$;

-- 2) Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_products_sync_image_url ON public.products;

CREATE TRIGGER trg_products_sync_image_url
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_sync_image_url();

-- 3) Add CHECK constraint to ensure images is a valid JSONB array
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_images_is_array;

ALTER TABLE public.products
  ADD CONSTRAINT products_images_is_array
  CHECK (
    images IS NULL
    OR jsonb_typeof(images) = 'array'
  ) NOT VALID;

-- 4) Add CHECK constraint to ensure image URLs are valid (Cloudinary or local)
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_image_url_format;

ALTER TABLE public.products
  ADD CONSTRAINT products_image_url_format
  CHECK (
    image_url IS NULL
    OR image_url ~ '^https?://(res\.cloudinary\.com/|/images/).*'
    OR image_url = ''
  ) NOT VALID;

-- 5) Add comments
COMMENT ON CONSTRAINT products_images_is_array ON public.products IS 'Ensures images is a valid JSONB array';
COMMENT ON CONSTRAINT products_image_url_format ON public.products IS 'Ensures image_url is a valid Cloudinary or local URL';
COMMENT ON FUNCTION public.products_sync_image_url() IS 'Auto-syncs image_url from images[0].url when image_url is NULL';
