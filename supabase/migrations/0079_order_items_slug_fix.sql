-- -----------------------------------------------------------------------------
-- 0079_order_items_slug_fix.sql
-- Fixes: order_items slug column constraint & trigger normalization
-- -----------------------------------------------------------------------------

-- 1) Ensure slug column exists on order_items table
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS slug text;

-- 2) Backfill slug from product_snapshot or products table if missing
UPDATE public.order_items oi
SET slug = COALESCE(
  nullif(trim(oi.slug), ''),
  nullif(trim(oi.product_snapshot->>'slug'), ''),
  (
    SELECT p.slug
    FROM public.products p
    WHERE p.id = oi.product_id
      AND p.slug IS NOT NULL
      AND trim(p.slug) <> ''
    LIMIT 1
  ),
  'unknown-item'
)
WHERE oi.slug IS NULL OR trim(oi.slug) = '';

-- 3) Update normalize trigger to ensure NEW.slug is never null
CREATE OR REPLACE FUNCTION public.tg_order_items_normalize()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  snap jsonb;
BEGIN
  snap := COALESCE(NEW.product_snapshot, '{}'::jsonb);

  -- Normalize product_name
  IF NEW.product_name IS NULL OR trim(NEW.product_name) = '' THEN
    NEW.product_name := COALESCE(
      nullif(trim(snap->>'name'), ''),
      nullif(trim(snap->>'title'), ''),
      'Unknown item'
    );
  END IF;

  -- Normalize slug
  IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
    NEW.slug := COALESCE(
      nullif(trim(snap->>'slug'), ''),
      CASE
        WHEN NEW.product_id IS NOT NULL THEN (
          SELECT p.slug FROM public.products p WHERE p.id = NEW.product_id LIMIT 1
        )
        ELSE NULL
      END,
      'unknown-item'
    );
  END IF;

  NEW.unit_price_egp := COALESCE(NEW.unit_price_egp, 0);
  NEW.quantity := COALESCE(NEW.quantity, 1);

  NEW.total_price_egp := COALESCE(
    NEW.total_price_egp,
    NEW.final_total_egp,
    NEW.unit_price_egp * NEW.quantity
  );

  NEW.final_total_egp := COALESCE(NEW.final_total_egp, NEW.total_price_egp);
  NEW.selected_addons := COALESCE(NEW.selected_addons, '[]'::jsonb);
  NEW.addons_total_egp := COALESCE(NEW.addons_total_egp, 0);

  IF NEW.product_snapshot IS NULL THEN
    NEW.product_snapshot := jsonb_build_object(
      'slug', NEW.slug,
      'name', NEW.product_name,
      'unit_price_egp', NEW.unit_price_egp
    );
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.tg_order_items_normalize() SET search_path = public;

DROP TRIGGER IF EXISTS trg_order_items_normalize ON public.order_items;
CREATE TRIGGER trg_order_items_normalize
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_order_items_normalize();
