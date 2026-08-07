-- =============================================================================
-- Cookie Bite — Final Fix: Change JSON columns to JSONB and fix function
-- =============================================================================

-- Change JSON columns to JSONB to avoid type conversion issues
ALTER TABLE public.order_items 
ALTER COLUMN product_snapshot TYPE jsonb USING product_snapshot::jsonb;

ALTER TABLE public.order_items 
ALTER COLUMN variant_snapshot TYPE jsonb USING variant_snapshot::jsonb;

ALTER TABLE public.order_items 
ALTER COLUMN selected_addons TYPE jsonb USING selected_addons::jsonb;

ALTER TABLE public.orders 
ALTER COLUMN shipping_address TYPE jsonb USING shipping_address::jsonb;

ALTER TABLE public.orders 
ALTER COLUMN gift_box_snapshot TYPE jsonb USING gift_box_snapshot::jsonb;

-- Recreate the function with proper JSONB handling
DROP FUNCTION IF EXISTS public.create_checkout_order_transactional CASCADE;

CREATE OR REPLACE FUNCTION public.create_checkout_order_transactional(
  p_user_id uuid,
  p_guest_email text,
  p_payment_method text,
  p_payment_status text,
  p_subtotal_egp numeric,
  p_delivery_fee_egp numeric,
  p_total_egp numeric,
  p_shipping_address jsonb,
  p_notes text,
  p_promo_code text,
  p_promo_id uuid,
  p_discount_amount_egp numeric,
  p_gift_wrapping_fee_egp numeric,
  p_order_type text,
  p_gift_box_snapshot jsonb,
  p_checkout_idempotency_key text,
  p_items jsonb
)
RETURNS TABLE (
  order_id uuid,
  order_number text,
  order_code text,
  success boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_order_number integer;
  v_order_code text;
  v_item jsonb;
  v_product_id uuid;
  v_currentstock integer;
  v_item_idx integer;
  v_slug text;
  v_quantity integer;
  v_unit_price numeric;
  v_variant_id uuid;
  v_error_detail text;
BEGIN
  -- Validate required fields
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, false, 'no_items'::text;
    RETURN;
  END IF;

  IF p_total_egp <= 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, false, 'invalid_total'::text;
    RETURN;
  END IF;

  -- Check idempotency key if provided
  IF p_checkout_idempotency_key IS NOT NULL THEN
    SELECT id, public.orders.order_number, public.orders.order_code
    INTO v_order_id, v_order_number, v_order_code
    FROM public.orders
    WHERE checkout_idempotency_key = p_checkout_idempotency_key
    LIMIT 1;

    IF v_order_id IS NOT NULL THEN
      RETURN QUERY SELECT v_order_id, v_order_number::text, v_order_code, true, 'idempotent'::text;
      RETURN;
    END IF;
  END IF;

  -- Validate stock availability for all items before proceeding
  FOR v_item_idx IN 0..jsonb_array_length(p_items)-1 LOOP
    v_item := p_items->v_item_idx;
    v_slug := v_item->>'slug';
    v_quantity := (v_item->>'quantity')::integer;

    -- Skip items marked as skip_product_lookup
    IF (v_item->>'skip_product_lookup')::boolean = true THEN
      CONTINUE;
    END IF;

    -- Get product and check stock
    SELECT id, stock INTO v_product_id, v_currentstock
    FROM public.products
    WHERE slug = v_slug
    LIMIT 1;

    IF v_product_id IS NULL THEN
      RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, false, ('product_not_found:' || v_slug)::text;
      RETURN;
    END IF;

    IF v_currentstock < v_quantity THEN
      RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, false, ('insufficient_stock:' || v_slug)::text;
      RETURN;
    END IF;
  END LOOP;

  -- Generate order code
  v_order_code := 'CB-' || upper(substr(md5(random()::text), 1, 6));

  -- Insert order
  BEGIN
    INSERT INTO public.orders (
      user_id,
      guest_email,
      status,
      payment_status,
      payment_method,
      subtotal_egp,
      delivery_fee_egp,
      total_egp,
      shipping_address,
      notes,
      promo_code,
      promo_id,
      discount_amount_egp,
      gift_wrapping_fee_egp,
      order_type,
      gift_box_snapshot,
      checkout_idempotency_key,
      order_code,
      currency,
      full_name,
      phone,
      email,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      p_guest_email,
      'pending',
      p_payment_status,
      p_payment_method,
      p_subtotal_egp,
      p_delivery_fee_egp,
      p_total_egp,
      p_shipping_address,
      p_notes,
      p_promo_code,
      p_promo_id,
      p_discount_amount_egp,
      p_gift_wrapping_fee_egp,
      p_order_type,
      p_gift_box_snapshot,
      p_checkout_idempotency_key,
      v_order_code,
      'EGP',
      COALESCE((p_shipping_address->>'name'), 'Guest Customer'),
      COALESCE((p_shipping_address->>'phone'), '+201000000000'),
      COALESCE(p_guest_email, (p_shipping_address->>'email'), ''),
      now(),
      now()
    )
    RETURNING id, public.orders.order_number
    INTO v_order_id, v_order_number;
  EXCEPTION
    WHEN OTHERS THEN
      v_error_detail := SQLERRM;
      RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, false, ('order_insert_failed:' || v_error_detail)::text;
      RETURN;
  END;

  -- Insert order items with direct JSONB extraction
  FOR v_item_idx IN 0..jsonb_array_length(p_items)-1 LOOP
    v_item := p_items->v_item_idx;
    v_slug := v_item->>'slug';
    v_quantity := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric;

    -- Get product ID if not skipping lookup
    IF (v_item->>'skip_product_lookup')::boolean = false THEN
      SELECT id INTO v_product_id
      FROM public.products
      WHERE slug = v_slug
      LIMIT 1;
    ELSE
      v_product_id := NULL;
    END IF;

    -- Extract variant_id safely
    IF (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') != '' THEN
      v_variant_id := (v_item->>'variant_id')::uuid;
    ELSE
      v_variant_id := NULL;
    END IF;

    -- Insert order item - use direct JSONB extraction in VALUES clause
    BEGIN
      INSERT INTO public.order_items (
        order_id,
        product_id,
        slug,
        product_name,
        quantity,
        unit_price_egp,
        addons_total_egp,
        final_total_egp,
        product_snapshot,
        variant_id,
        variant_snapshot,
        selected_addons,
        created_at
      )
      VALUES (
        v_order_id,
        v_product_id,
        v_slug,
        v_item->>'name',
        v_quantity,
        v_unit_price,
        (v_item->>'addons_total_unit_price')::numeric,
        COALESCE((v_item->>'final_unit_price')::numeric, v_unit_price),
        v_item->'product_snapshot',           -- Direct JSONB extraction
        CASE WHEN (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') != '' THEN (v_item->>'variant_id')::uuid ELSE NULL END,
        v_item->'variant_snapshot',           -- Direct JSONB extraction
        v_item->'selected_addons',            -- Direct JSONB extraction
        now()
      );
    EXCEPTION
      WHEN OTHERS THEN
        v_error_detail := SQLERRM;
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, false, ('order_item_insert_failed:' || v_slug || ':' || v_error_detail)::text;
        RETURN;
    END;

    -- Decrement stock atomically
    IF v_product_id IS NOT NULL THEN
      IF v_variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET stock = stock - v_quantity
        WHERE id = v_variant_id AND stock >= v_quantity;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'variant_stock_race_condition:%', v_slug;
        END IF;
      ELSE
        UPDATE public.products
        SET stock = stock - v_quantity
        WHERE id = v_product_id AND stock >= v_quantity;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'stock_race_condition:%', v_slug;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- Record promo use if provided
  IF p_promo_id IS NOT NULL THEN
    INSERT INTO public.promo_uses (promo_id, order_id, user_id, used_at)
    VALUES (p_promo_id, v_order_id, p_user_id, now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_order_id, v_order_number::text, v_order_code, true, NULL::text;

EXCEPTION
  WHEN OTHERS THEN
    v_error_detail := SQLERRM;
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, false, ('checkout_failed:' || v_error_detail)::text;
END;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.create_checkout_order_transactional(
  uuid, text, text, text, numeric, numeric, numeric, jsonb, text, text, uuid, numeric, numeric, text, jsonb, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order_transactional(
  uuid, text, text, text, numeric, numeric, numeric, jsonb, text, text, uuid, numeric, numeric, text, jsonb, text, jsonb
) TO service_role;
