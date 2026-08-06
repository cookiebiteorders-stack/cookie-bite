-- =============================================================================
-- Cookie Bite — Migration 0102: Order code collision retry loop (DB-10)
-- Purpose: Add retry loop for order code generation to handle unique constraint violations
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_checkout_order_transactional(
  p_user_id uuid,
  p_order_code text,
  p_order_number bigint,
  p_notes text,
  p_total_amount numeric,
  p_delivery_fee numeric,
  p_gift_message text,
  p_items jsonb,
  p_promo_id uuid,
  p_promo_code text,
  p_payment_method text,
  p_billing_name text,
  p_billing_email text,
  p_billing_phone text,
  p_billing_address jsonb,
  p_shipping_address jsonb,
  p_special_reference text
) RETURNS TABLE (
  order_id uuid,
  order_number text,
  order_code text,
  success boolean,
  error_message text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_id uuid;
  v_order_number integer;
  v_order_code text;
  v_item jsonb;
  v_product_id uuid;
  v_currentstock integer;
  v_slug text;
  v_quantity integer;
  v_unit_price numeric;
  v_variant_id text;
  v_retry_count integer := 0;
  v_max_retries integer := 10;
BEGIN
  -- Check idempotency key if provided
  IF p_checkout_idempotency_key IS NOT NULL THEN
    SELECT id, order_number, order_code
    INTO v_order_id, v_order_number, v_order_code
    FROM public.orders
    WHERE checkout_idempotency_key = p_checkout_idempotency_key
    LIMIT 1;

    IF v_order_id IS NOT NULL THEN
      RETURN QUERY SELECT v_order_id, v_order_number::text, v_order_code, true, 'idempotent'::text;
      RETURN;
    END IF;
  END IF;

  -- Get next order number
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO v_order_number FROM public.orders;

  -- DB-10: Retry loop for order code generation to handle collisions
  <<retry_loop>>
  LOOP
    v_retry_count := v_retry_count + 1;
    
    -- Generate order code with timestamp + random for uniqueness
    v_order_code := 'CB-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || now()::text), 1, 6));
    
    -- Validate and reserve stock for each item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
      v_product_id := (v_item->>'product_id')::uuid;
      v_quantity := (v_item->>'quantity')::integer;
      v_unit_price := (v_item->>'unit_price')::numeric;
      v_slug := v_item->>'slug';
      v_variant_id := v_item->>'variant_id';

      -- Get current stock
      IF v_variant_id IS NOT NULL THEN
        SELECT stock INTO v_currentstock
        FROM public.product_variants
        WHERE id = v_variant_id::uuid;
      ELSE
        SELECT stock INTO v_currentstock
        FROM public.products
        WHERE id = v_product_id;
      END IF;

      IF v_currentstock IS NULL OR v_currentstock < v_quantity THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, false, 
          ('Insufficient stock for: ' || v_slug)::text;
        RETURN;
      END IF;
    END LOOP;

    -- Try to insert order with generated order code
    BEGIN
      INSERT INTO public.orders (
        user_id,
        order_number,
        order_code,
        total_amount,
        delivery_fee,
        notes,
        gift_message,
        payment_status,
        status,
        payment_method,
        billing_address,
        shipping_address,
        special_reference,
        order_type,
        gift_box_snapshot,
        checkout_idempotency_key,
        currency,
        full_name,
        phone,
        email,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        v_order_number,
        v_order_code,
        p_total_amount,
        p_delivery_fee,
        -- DB-10: Align notes/gift_message mapping - use p_notes for notes, p_gift_message for gift_message
        COALESCE(p_notes, 'Paymob checkout'),
        p_gift_message,
        'unpaid',
        'pending',
        p_payment_method,
        p_billing_address,
        p_shipping_address,
        p_special_reference,
        'standard',
        NULL::jsonb,
        p_checkout_idempotency_key,
        'EGP',
        COALESCE((p_shipping_address->>'name'), 'Guest Customer'),
        COALESCE((p_shipping_address->>'phone'), '+201000000000'),
        COALESCE((p_shipping_address->>'email'), p_billing_email),
        now(),
        now()
      )
      RETURNING id INTO v_order_id;
      
      -- If we get here, insertion succeeded - exit retry loop
      EXIT retry_loop;
      
    EXCEPTION
      WHEN unique_violation THEN
        -- Order code collision, retry if we haven't exceeded max retries
        IF v_retry_count >= v_max_retries THEN
          RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, false, 
            'Failed to generate unique order code after retries'::text;
          RETURN;
        END IF;
        -- Continue to next iteration of retry loop
        CONTINUE retry_loop;
    END;
  END LOOP;

  -- Insert order items and decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_variant_id := v_item->>'variant_id';

    INSERT INTO public.order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      addons_total_unit_price,
      final_unit_price,
      product_snapshot,
      variant_id,
      variant_snapshot,
      selected_addons,
      created_at
    ) VALUES (
      v_order_id,
      v_product_id,
      v_quantity,
      v_unit_price,
      (v_item->>'addons_total_unit_price')::numeric,
      COALESCE((v_item->>'final_unit_price')::numeric, v_unit_price),
      v_item->'product_snapshot',
      v_item->>'variant_id',
      v_item->'variant_snapshot',
      v_item->'selected_addons',
      now()
    );

    -- Decrement stock atomically (ORD-02: handle both products and product_variants)
    IF v_product_id IS NOT NULL THEN
      IF v_variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET stock = stock - v_quantity
        WHERE id = v_variant_id::uuid AND stock >= v_quantity;

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

  -- Record promo use if provided (DB-08: use promo_code_uses instead of promo_uses)
  IF p_promo_id IS NOT NULL THEN
    INSERT INTO public.promo_code_uses (promo_code_id, order_id, user_id, used_at)
    VALUES (p_promo_id, v_order_id, p_user_id, now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_order_id, v_order_number::text, v_order_code, true, NULL::text;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, false, SQLERRM::text;
END $$;

-- Grant execute permission to service_role only
REVOKE ALL ON FUNCTION public.create_checkout_order_transactional(
  uuid, text, text, text, numeric, numeric, text, jsonb, text, text, text, text, text, text, jsonb, jsonb, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order_transactional(
  uuid, text, text, text, numeric, numeric, text, jsonb, text, text, text, text, text, text, jsonb, jsonb, text
) TO service_role;

COMMENT ON FUNCTION public.create_checkout_order_transactional IS
'Atomic transactional checkout with order code collision retry loop (DB-10). Validates stock, reserves inventory, inserts order and items in a single transaction. Returns order_id, order_number, order_code, success flag, and error_message if failed.';
