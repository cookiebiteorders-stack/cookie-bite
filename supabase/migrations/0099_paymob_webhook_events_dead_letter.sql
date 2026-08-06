-- =============================================================================
-- Cookie Bite — Migration 0099: Paymob webhook events dead-letter table (WH-04)
-- Purpose: Log all webhook events including unmatched ones for debugging and alerting
-- =============================================================================

-- Create table to log all Paymob webhook events
CREATE TABLE paymob_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paymob_order_id bigint NOT NULL,
  paymob_transaction_id text,
  hmac_verified boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  matched_order_id uuid,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Prevent duplicate processing of same transaction
  CONSTRAINT paymob_webhook_events_unique_tx UNIQUE (paymob_transaction_id)
);

-- Add indexes for querying
CREATE INDEX paymob_webhook_events_paymob_order_idx 
  ON paymob_webhook_events (paymob_order_id);
  
CREATE INDEX paymob_webhook_events_processed_idx 
  ON paymob_webhook_events (processed) 
  WHERE processed = false;

CREATE INDEX paymob_webhook_events_created_at_idx 
  ON paymob_webhook_events (created_at DESC);

-- Enable RLS
ALTER TABLE paymob_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write (webhook handler runs as service_role)
CREATE POLICY "service_role_all" ON paymob_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No access for anon or authenticated users
CREATE POLICY "no_anon_access" ON paymob_webhook_events
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "no_authenticated_access" ON paymob_webhook_events
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
