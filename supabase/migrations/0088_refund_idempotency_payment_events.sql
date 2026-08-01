-- =============================================================================
-- Cookie Bite — Migration 0088: Refund idempotency and immutable payment events
-- =============================================================================
-- This migration creates:
-- 1. payment_events table - immutable log of all payment events (charge, refund, etc.)
-- 2. refund_requests table - tracks refund attempts with idempotency keys
-- 3. PostgreSQL RPC function for atomic refund processing
-- 
-- This ensures:
-- - Refunds are idempotent (duplicate requests return the same result)
-- - All payment events are immutable and auditable
-- - Refund processing is atomic (no partial states)
-- =============================================================================

-- Create payment_events table (immutable audit log of payment events)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('charge', 'refund', 'partial_refund', 'chargeback', 'dispute')),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  gateway_transaction_id text,
  gateway_response jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error_message text
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS payment_events_order_id_idx ON public.payment_events(order_id);
CREATE INDEX IF NOT EXISTS payment_events_type_status_idx ON public.payment_events(event_type, status);
CREATE INDEX IF NOT EXISTS payment_events_created_at_idx ON public.payment_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Only service_role can write (events are immutable once written)
CREATE POLICY "Service role can insert payment events" ON public.payment_events
  FOR INSERT TO service_role WITH CHECK (true);

-- Admin can read for audit
CREATE POLICY "Admin can read payment events" ON public.payment_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('owner', 'admin', 'staff')
    )
  );

-- Create refund_requests table (idempotent refund tracking)
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  reason text,
  requested_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  requested_by_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payment_event_id uuid REFERENCES public.payment_events(id) ON DELETE SET NULL,
  gateway_transaction_id text,
  gateway_response jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Add indexes
CREATE INDEX IF NOT EXISTS refund_requests_order_id_idx ON public.refund_requests(order_id);
CREATE INDEX IF NOT EXISTS refund_requests_idempotency_key_idx ON public.refund_requests(idempotency_key);
CREATE INDEX IF NOT EXISTS refund_requests_status_idx ON public.refund_requests(status);
CREATE INDEX IF NOT EXISTS refund_requests_created_at_idx ON public.refund_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Service role can write
CREATE POLICY "Service role can insert refund requests" ON public.refund_requests
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update refund requests" ON public.refund_requests
  FOR UPDATE TO service_role WITH CHECK (true);

-- Admin can read
CREATE POLICY "Admin can read refund requests" ON public.refund_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('owner', 'admin', 'staff')
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.tg_refund_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_refund_requests_updated_at();

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.process_refund_transactional CASCADE;

-- Create atomic refund processing function
CREATE OR REPLACE FUNCTION public.process_refund_transactional(
  p_order_id uuid,
  p_idempotency_key text,
  p_amount_cents integer,
  p_reason text,
  p_requested_by_user_id uuid,
  p_requested_by_email text,
  p_gateway_transaction_id text,
  p_gateway_response jsonb DEFAULT NULL
)
RETURNS TABLE (
  refund_request_id uuid,
  payment_event_id uuid,
  success boolean,
  error_message text,
  is_idempotent boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund_request_id uuid;
  v_payment_event_id uuid;
  v_order_payment_status text;
  v_order_total_cents integer;
  v_existing_refund uuid;
  v_existing_event uuid;
BEGIN
  -- Validate amount
  IF p_amount_cents <= 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, 'invalid_amount'::text, false::boolean;
    RETURN;
  END IF;

  -- Check idempotency - if a refund request with this key exists, return it
  SELECT id, payment_event_id INTO v_existing_refund, v_existing_event
  FROM public.refund_requests
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_existing_refund IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_refund, v_existing_event, true, NULL::text, true::boolean;
    RETURN;
  END IF;

  -- Lock the order for update to prevent concurrent refunds
  SELECT payment_status, total_egp
  INTO v_order_payment_status, v_order_total_cents
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, 'order_not_found'::text, false::boolean;
    RETURN;
  END IF;

  -- Validate order is paid
  IF v_order_payment_status != 'paid' THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, 'order_not_paid'::text, false::boolean;
    RETURN;
  END IF;

  -- Validate refund amount doesn't exceed order total
  v_order_total_cents := ROUND(v_order_total_cents * 100);
  IF p_amount_cents > v_order_total_cents THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, 'refund_exceeds_total'::text, false::boolean;
    RETURN;
  END IF;

  -- Check if order already has a completed refund
  SELECT id INTO v_existing_refund
  FROM public.refund_requests
  WHERE order_id = p_order_id AND status = 'completed'
  LIMIT 1;

  IF v_existing_refund IS NOT NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, 'order_already_refunded'::text, false::boolean;
    RETURN;
  END IF;

  -- Create refund request record
  INSERT INTO public.refund_requests (
    order_id,
    idempotency_key,
    amount_cents,
    reason,
    requested_by_user_id,
    requested_by_email,
    status,
    gateway_transaction_id,
    gateway_response
  )
  VALUES (
    p_order_id,
    p_idempotency_key,
    p_amount_cents,
    p_reason,
    p_requested_by_user_id,
    p_requested_by_email,
    'processing',
    p_gateway_transaction_id,
    p_gateway_response
  )
  RETURNING id
  INTO v_refund_request_id;

  -- Create payment event record
  INSERT INTO public.payment_events (
    order_id,
    event_type,
    amount_cents,
    currency,
    status,
    gateway_transaction_id,
    gateway_response,
    processed_at
  )
  VALUES (
    p_order_id,
    CASE WHEN p_amount_cents = v_order_total_cents THEN 'refund' ELSE 'partial_refund' END,
    p_amount_cents,
    'EGP',
    'completed',
    p_gateway_transaction_id,
    p_gateway_response,
    now()
  )
  RETURNING id
  INTO v_payment_event_id;

  -- Update refund request with payment event link and completed status
  UPDATE public.refund_requests
  SET
    payment_event_id = v_payment_event_id,
    status = 'completed',
    completed_at = now()
  WHERE id = v_refund_request_id;

  -- Update order status to refunded
  UPDATE public.orders
  SET
    payment_status = 'refunded',
    status = 'refunded',
    updated_at = now()
  WHERE id = p_order_id;

  RETURN QUERY SELECT v_refund_request_id, v_payment_event_id, true, NULL::text, false::boolean;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and update refund request status to failed
    IF v_refund_request_id IS NOT NULL THEN
      UPDATE public.refund_requests
      SET
        status = 'failed',
        error_message = SQLERRM,
        updated_at = now()
      WHERE id = v_refund_request_id;
    END IF;
    
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, SQLERRM::text, false::boolean;
END;
$$;

-- Grant execute permission to service_role only
REVOKE ALL ON FUNCTION public.process_refund_transactional(
  uuid, text, integer, text, uuid, text, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_refund_transactional(
  uuid, text, integer, text, uuid, text, text, jsonb
) TO service_role;

COMMENT ON TABLE public.payment_events IS 'Immutable audit log of all payment events (charges, refunds, disputes)';
COMMENT ON TABLE public.refund_requests IS 'Idempotent refund request tracking with gateway integration';
COMMENT ON FUNCTION public.process_refund_transactional IS 'Atomic refund processing with idempotency and immutable event logging';
