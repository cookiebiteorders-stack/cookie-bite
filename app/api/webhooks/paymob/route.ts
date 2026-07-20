import { verifyPaymobTransactionHmac } from "@/lib/paymob/hmac";
import { resolvePaymobHmacSecret } from "@/lib/paymob/env";
import { resolvePaymobPaymentOutcome } from "@/lib/paymob/outcome";
import { updateOrderPaymentByPaymobAcceptOrderId } from "@/lib/db/orders";
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
  const paymobOrderId = typeof order.id === "number" ? order.id : Number(order.id);
  if (!Number.isFinite(paymobOrderId)) {
    return Response.json({ ok: false, reason: "no order id" }, { status: 400 });
  }

  const rawTxId = transaction.id;
  const paymobTransactionId =
    rawTxId == null || rawTxId === "" ? null : String(rawTxId);

  const resolved = resolvePaymobPaymentOutcome(transaction);

  const updated = await updateOrderPaymentByPaymobAcceptOrderId(
    paymobOrderId,
    {
      payment_status: resolved.payment_status,
      status: resolved.status,
    },
    paymobTransactionId,
  );

  if (updated.ok) {
    if (resolved.outcome === "paid" && updated.becamePaid) {
      schedulePaymentConfirmed(updated.orderId);
      void awardLoyaltyPointsForPaidOrder(updated.orderId).catch((err) =>
        console.error("loyalty award after paymob", err),
      );
    } else if (resolved.outcome === "failed") {
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
