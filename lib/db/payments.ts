import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RefundRequestRow = {
  id: string;
  order_id: string;
  idempotency_key: string;
  amount_cents: number;
  reason: string | null;
  requested_by_user_id: string | null;
  requested_by_email: string | null;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  payment_event_id: string | null;
  gateway_transaction_id: string | null;
  gateway_response: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type PaymentEventRow = {
  id: string;
  order_id: string;
  event_type: "charge" | "refund" | "partial_refund" | "chargeback" | "dispute";
  amount_cents: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  gateway_transaction_id: string | null;
  gateway_response: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
  processed_at: string | null;
  error_message: string | null;
};

export type RefundProcessResult = {
  refundRequestId: string;
  paymentEventId: string;
  success: boolean;
  errorMessage: string | null;
  isIdempotent: boolean;
};

/**
 * Process refund transactionally with idempotency and immutable event logging.
 * This function calls the PostgreSQL RPC function to ensure atomic refund processing.
 */
export async function processRefundTransactional(params: {
  orderId: string;
  idempotencyKey: string;
  amountCents: number;
  reason?: string | null;
  requestedByUserId?: string | null;
  requestedByEmail?: string | null;
  gatewayTransactionId?: string | null;
  gatewayResponse?: Record<string, unknown> | null;
}): Promise<RefundProcessResult> {
  console.log("[Refund Transactional] Processing refund:", JSON.stringify(params, null, 2));

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc("process_refund_transactional", {
    p_order_id: params.orderId,
    p_idempotency_key: params.idempotencyKey,
    p_amount_cents: params.amountCents,
    p_reason: params.reason ?? null,
    p_requested_by_user_id: params.requestedByUserId ?? null,
    p_requested_by_email: params.requestedByEmail ?? null,
    p_gateway_transaction_id: params.gatewayTransactionId ?? null,
    p_gateway_response: params.gatewayResponse ?? null,
  });

  if (error) {
    console.error("[Refund Transactional] RPC error:", JSON.stringify(error, null, 2));
    throw new Error(`Failed to process refund transactionally: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.error("[Refund Transactional] No data returned from RPC");
    throw new Error("No data returned from transactional refund processing");
  }

  const result = data[0] as {
    refund_request_id: string;
    payment_event_id: string;
    success: boolean;
    error_message: string | null;
    is_idempotent: boolean;
  };

  console.log("[Refund Transactional] Result:", result);

  return {
    refundRequestId: result.refund_request_id,
    paymentEventId: result.payment_event_id,
    success: result.success,
    errorMessage: result.error_message,
    isIdempotent: result.is_idempotent,
  };
}

/**
 * Get refund request by idempotency key
 */
export async function getRefundRequestByIdempotencyKey(
  idempotencyKey: string,
): Promise<RefundRequestRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("refund_requests")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle<RefundRequestRow>();

  if (error) {
    console.error("getRefundRequestByIdempotencyKey error", error);
    return null;
  }
  return data ?? null;
}

/**
 * Get payment events for an order
 */
export async function getPaymentEventsForOrder(orderId: string): Promise<PaymentEventRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("payment_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPaymentEventsForOrder error", error);
    return [];
  }
  return (data as PaymentEventRow[]) ?? [];
}

/**
 * Get refund requests for an order
 */
export async function getRefundRequestsForOrder(orderId: string): Promise<RefundRequestRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("refund_requests")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getRefundRequestsForOrder error", error);
    return [];
  }
  return (data as RefundRequestRow[]) ?? [];
}
