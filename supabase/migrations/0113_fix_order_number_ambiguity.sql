-- =============================================================================
-- Cookie Bite — Migration 0113: Fix order_number ambiguity in checkout function
-- =============================================================================
-- This migration fixes the "column reference order_number is ambiguous" error
-- by explicitly qualifying the order_number column references in the 
-- create_checkout_order_transactional function to avoid conflicts with
-- the RETURNS TABLE order_number column.
-- =============================================================================

-- Drop and recreate the function with explicit table qualifications
DROP FUNCTION IF EXISTS public.create_checkout_order_transactional CASCADE;

-- Create the transactional checkout function with fixed order_number references
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

  -- Check idempotency key if provided (FIXED: qualified order_number)
  IF p_checkout_idempotency_key IS NOT NULL THEN
    SELECT id, public.orders.order_number, order_code
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

  -- Insert order (FIXED: qualified order_number in RETURNING)
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

  -- Insert order items and decrement stock atomically
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

    -- Insert order item with correct column names, type conversion, and JSON null handling
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
      COALESCE(v_item->>'name', v_slug),
      v_quantity,
      v_unit_price,
      COALESCE((v_item->>'addons_total_unit_price')::numeric, 0),
      COALESCE((v_item->>'final_unit_price')::numeric, v_unit_price * v_quantity),
      COALESCE(v_item->'product_snapshot', '{}'::jsonb),
      (v_item->>'variant_id')::uuid,
      COALESCE(v_item->'variant_snapshot', '{}'::jsonb),
      COALESCE(v_item->'selected_addons', '[]'::jsonb),
      now()
    );

    -- Decrement stock for products (not for skip_product_lookup items)
    IF v_product_id IS NOT NULL AND (v_item->>'skip_product_lookup')::boolean = false THEN
      UPDATE public.products
      SET stock = stock - v_quantity,
          updated_at = now()
      WHERE id = v_product_id;
    END IF;
  END LOOP;

  -- Handle promo code usage
  IF p_promo_id IS NOT NULL THEN
    INSERT INTO public.promo_code_uses (
      promo_id,
      order_id,
      user_id,
      used_at
    ) VALUES (
      p_promo_id,
      v_order_id,
      p_user_id,
      now()
    );
  END IF;

  -- Return success
  RETURN QUERY SELECT v_order_id, v_order_number::text, v_order_code, true, NULL::text;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return failure
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, false, SQLERRM::text;
END;
$$;

-- Grant execute permissions to service_role only
REVOKE ALL ON FUNCTION public.create_checkout_order_transactional(
  uuid, text, text, text, numeric, numeric, numeric, jsonb, text, text, uuid, numeric, numeric, text, jsonb, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order_transactional(
  uuid, text, text, text, numeric, numeric, numeric, jsonb, text, text, uuid, numeric, numeric, text, jsonb, text, jsonb
) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.create_checkout_order_transactional IS 
'Transactional checkout order creation with sequence-based order_number allocation, atomic stock reservation, and idempotency handling. Fixed order_number ambiguity by explicitly qualifying table references.';
