import crypto from "node:crypto";

/** تحويل قيمة الـ callback لسلسلة بنفس سلوك أمثلة Paymob الشائعة. */
function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

/**
 * التحقق من HMAC لمعاملة Transaction Processed (صيغة الدمج الشائعة في تكاملات Accept).
 * إن تغيّرت صيغة Paymob لديك، طابق الحقل `connected` مع لوحة الاختبار / الوثائق.
 */
export function verifyPaymobTransactionHmac(
  transaction: Record<string, unknown>,
  receivedHmac: string,
  secret: string,
): boolean {
  if (!receivedHmac || !secret) return false;
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

  const computed = crypto.createHmac("sha512", secret).update(connected).digest("hex");
  return computed.toLowerCase() === receivedHmac.toLowerCase();
}
