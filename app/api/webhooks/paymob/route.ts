import { verifyPaymobTransactionHmac } from "@/lib/paymob/hmac";
import { updateOrderPaymentByPaymobAcceptOrderId } from "@/lib/db/orders";

type PaymobCallbackBody = {
  obj?: Record<string, unknown>;
  hmac?: string;
  /** بعض الإصدارات تضع التوقيع داخل obj */
  type?: string;
};

/**
 * Transaction Processed Callback من Paymob.
 * اضبط نفس المسار في لوحة Paymob (HTTPS عام).
 */
export async function POST(req: Request) {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret) {
    return new Response("Missing PAYMOB_HMAC_SECRET", { status: 500 });
  }

  let body: PaymobCallbackBody;
  try {
    body = (await req.json()) as PaymobCallbackBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const transaction = (body.obj ?? body) as Record<string, unknown>;
  const receivedHmac =
    typeof body.hmac === "string"
      ? body.hmac
      : typeof transaction.hmac === "string"
        ? (transaction.hmac as string)
        : "";

  if (!verifyPaymobTransactionHmac(transaction, receivedHmac, secret)) {
    console.error("Paymob webhook: HMAC mismatch or unsupported payload shape");
    return new Response("Invalid HMAC", { status: 400 });
  }

  const success = Boolean(transaction.success);
  const order = (transaction.order ?? {}) as Record<string, unknown>;
  const paymobOrderId = typeof order.id === "number" ? order.id : Number(order.id);
  if (!Number.isFinite(paymobOrderId)) {
    return Response.json({ ok: false, reason: "no order id" }, { status: 400 });
  }

  await updateOrderPaymentByPaymobAcceptOrderId(paymobOrderId, {
    payment_status: success ? "paid" : "failed",
    status: success ? "processing" : "pending",
  });

  return Response.json({ ok: true });
}
