import { verifyPaymobTransactionHmac } from "@/lib/paymob/hmac";
import { resolvePaymobHmacSecret } from "@/lib/paymob/env";
import { resolvePaymobPaymentOutcome } from "@/lib/paymob/outcome";
import { updateOrderPaymentByPaymobAcceptOrderId, releaseStockForOrder, recordPayment } from "@/lib/db/orders";
import { schedulePaymentConfirmed } from "@/lib/notifications/schedule";
import { awardLoyaltyPointsForPaidOrder } from "@/lib/loyalty/award-order-points";
import { notifyStoreOrderEvent } from "@/lib/notifications/store-order-events";

type PaymobCallbackBody = {
  obj?: Record<string, unknown>;
  hmac?: string;
  type?: string;
};

function resolveHmac(req: Request, body: PaymobCallbackBody, transaction: Record<string, unknown>): string {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("hmac");
  if (fromQuery) return fromQuery;
  if (typeof body.hmac === "string") return body.hmac;
  if (typeof transaction.hmac === "string") return transaction.hmac;
  return "";
}

/**
 * Transaction Processed Callback من Paymob.
 * اضبط نفس المسار في لوحة Paymob (HTTPS عام).
 */
export async function POST(req: Request) {
  const secret = resolvePaymobHmacSecret();
  if (!secret) {
    return new Response("Missing PAYMOB_HMAC_SECRET (or legacy PAYMOB_HMAC)", { status: 500 });
  }

  let body: PaymobCallbackBody;
  try {
    body = (await req.json()) as PaymobCallbackBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const transaction = (body.obj ?? body) as Record<string, unknown>;
  const receivedHmac = resolveHmac(req, body, transaction);

  if (!verifyPaymobTransactionHmac(transaction, receivedHmac, secret)) {
    console.error("Paymob webhook: HMAC mismatch or unsupported payload shape");
    return new Response("Invalid HMAC", { status: 401 });
  }

  const order = (transaction.order ?? {}) as Record<string, unknown>;
  const paymobOrderId = Number((transaction.order as Record<string, unknown>)?.id || transaction.order_id);
  if (!Number.isFinite(paymobOrderId)) {
    return Response.json({ ok: false, reason: "no order id" }, { status: 400 });
  }

  const rawTxId = transaction.id;
  const paymobTransactionId = String(transaction.id || "");
  const resolved = resolvePaymobPaymentOutcome(transaction);

  // PAY-01: Verify critical transaction fields before processing
  const amountCents = typeof transaction.amount_cents === "number" 
    ? transaction.amount_cents 
    : Number(transaction.amount_cents);
  const currency = String(transaction.currency || "").toUpperCase();
  const integrationId = Number(transaction.integration_id || 0);
  const isVoided = Boolean(transaction.is_voided || transaction.is_void === true);
  const isRefunded = Boolean(transaction.is_refunded || transaction.is_refund === true);

  // Reject voided or refunded transactions (they should not mark orders as paid)
  if (isVoided || isRefunded) {
    console.warn("Paymob webhook: transaction is voided or refunded, skipping", {
      paymobOrderId,
      paymobTransactionId,
      isVoided,
      isRefunded,
    });
    return new Response("Transaction voided or refunded - ignored", { status: 200 });
  }

  // Verify currency is EGP
  if (currency !== "EGP") {
    console.error("Paymob webhook: invalid currency", { currency, paymobOrderId });
    return new Response("Invalid currency", { status: 400 });
  }

  // Verify integration_id matches expected values (card or wallet)
  const { resolvePaymobIntegrationId } = await import("@/lib/paymob/config");
  const allowedIntegrationIds = [
    resolvePaymobIntegrationId("card"),
    resolvePaymobIntegrationId("wallet"),
  ].filter(Boolean) as number[];

  if (allowedIntegrationIds.length > 0 && !allowedIntegrationIds.includes(integrationId)) {
    console.error("Paymob webhook: integration_id mismatch", { 
      received: integrationId, 
      expected: allowedIntegrationIds,
      paymobOrderId,
    });
    return new Response("Integration ID mismatch", { status: 400 });
  }

  const updated = await updateOrderPaymentByPaymobAcceptOrderId(
    paymobOrderId,
    {
      payment_status: resolved.payment_status,
      status: resolved.status,
    },
    paymobTransactionId,
  );

  // WH-04: Log webhook event to dead-letter table for debugging
  const supabase = (await import("@/lib/supabase/admin")).createSupabaseAdminClient();
  void (async () => {
    try {
      await supabase
        .from("paymob_webhook_events")
        .insert({
          paymob_order_id: paymobOrderId,
          paymob_transaction_id: paymobTransactionId || null,
          hmac_verified: true,
          payload: transaction,
          processed: updated.ok,
          matched_order_id: updated.ok ? updated.orderId : null,
          error_message: updated.ok ? null : "Order not found",
        });
    } catch (err) {
      console.error("Failed to log webhook event", err);
    }
  })();

  if (updated.ok) {
    if (resolved.outcome === "paid" && updated.becamePaid) {
      // Record payment in ledger (PAY-02)
      void recordPayment(
        updated.orderId,
        paymobTransactionId || "",
        amountCents,
        currency,
        "paymob",
        { paymob_order_id: paymobOrderId, raw_transaction: transaction },
      ).catch((err) => console.error("payment record after paymob", err));
      
      schedulePaymentConfirmed(updated.orderId);
      void awardLoyaltyPointsForPaidOrder(updated.orderId).catch((err) =>
        console.error("loyalty award after paymob", err),
      );
      
      // Notify store admins/owners about successful payment
      void notifyStoreOrderEvent({
        orderId: updated.orderId,
        event: "paid",
        note: "Paymob payment completed successfully",
      }).catch((err) => console.error("store paymob paid alert", err));
    } else if (resolved.outcome === "failed") {
      // Release stock for failed payments (DB-01)
      void releaseStockForOrder(updated.orderId).catch((err) =>
        console.error("stock release after payment failed", err),
      );
      
      void notifyStoreOrderEvent({
        orderId: updated.orderId,
        event: "payment_failed",
        note: "Paymob transaction declined or failed",
      }).catch((err) => console.error("store paymob failed alert", err));
    }
  } else {
    console.error("Paymob webhook: order not found for paymob_accept_order_id", paymobOrderId);
  }

  // Always 200 after HMAC ok so Paymob does not retry forever on missing local order.
  return Response.json({
    ok: true,
    matched: updated.ok,
    outcome: resolved.outcome,
  });
}
