import crypto from "node:crypto";

/** تحويل قيمة الـ callback لسلسلة بنفس سلوك أمثلة Paymob الشائعة. */
function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a.toLowerCase(), "utf8");
    const bufB = Buffer.from(b.toLowerCase(), "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * HMAC for Transaction Processed (POST) callbacks — field order from Paymob docs.
 * https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-hmac/hmac-transaction-callback
 */
export function computePaymobTransactionHmac(
  transaction: Record<string, unknown>,
  secret: string,
): string {
  const order = (transaction.order ?? {}) as Record<string, unknown>;
  const sourceData = (transaction.source_data ?? {}) as Record<string, unknown>;
  const connected =
    str(transaction.amount_cents) +
    str(transaction.created_at) +
    str(transaction.currency) +
    str(transaction.error_occured) +
    str(transaction.has_parent_transaction) +
    str(transaction.id) +
    str(transaction.integration_id) +
    str(transaction.is_3d_secure) +
    str(transaction.is_auth) +
    str(transaction.is_capture) +
    str(transaction.is_refunded) +
    str(transaction.is_standalone_payment) +
    str(transaction.is_voided) +
    str(order.id) +
    str(transaction.owner) +
    str(transaction.pending) +
    str(sourceData.pan) +
    str(sourceData.sub_type) +
    str(sourceData.type) +
    str(transaction.success);

  return crypto.createHmac("sha512", secret).update(connected).digest("hex");
}

export function verifyPaymobTransactionHmac(
  transaction: Record<string, unknown>,
  receivedHmac: string,
  secret: string,
): boolean {
  if (!receivedHmac || !secret) return false;
  const computed = computePaymobTransactionHmac(transaction, secret);
  return timingSafeEqualHex(computed, receivedHmac.trim());
}

/**
 * HMAC for browser Response (GET) redirects — uses flat query-style fields.
 * Keys differ slightly from Processed: `id` and `order.id` → `order_id`.
 */
export function verifyPaymobResponseHmac(
  params: Record<string, string | undefined>,
  receivedHmac: string,
  secret: string,
): boolean {
  if (!receivedHmac || !secret) return false;
  const connected =
    str(params.amount_cents) +
    str(params.created_at) +
    str(params.currency) +
    str(params.error_occured) +
    str(params.has_parent_transaction) +
    str(params.id) +
    str(params.integration_id) +
    str(params.is_3d_secure) +
    str(params.is_auth) +
    str(params.is_capture) +
    str(params.is_refunded) +
    str(params.is_standalone_payment) +
    str(params.is_voided) +
    str(params.order) +
    str(params.owner) +
    str(params.pending) +
    str(params["source_data.pan"]) +
    str(params["source_data.sub_type"]) +
    str(params["source_data.type"]) +
    str(params.success);

  const computed = crypto.createHmac("sha512", secret).update(connected).digest("hex");
  return timingSafeEqualHex(computed, receivedHmac.trim());
}
