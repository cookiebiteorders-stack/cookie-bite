/**
 * Map Paymob transaction flags to local order payment status.
 */

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.toLowerCase();
    return v === "true" || v === "1" || v === "yes";
  }
  return Boolean(value);
}

/**
 * pending=true → unpaid (do not mark failed)
 * success=true → paid with confirmed status
 * success=false && pending=false → failed
 */
export function resolvePaymobPaymentOutcome(transaction: Record<string, unknown>): {
  payment_status: "paid" | "failed" | "unpaid";
  status: "confirmed" | "pending";
  outcome: "paid" | "failed" | "pending";
} {
  const pending = toBool(transaction.pending);
  const success = toBool(transaction.success);

  if (success) {
    return { payment_status: "paid", status: "confirmed", outcome: "paid" };
  }
  if (pending) {
    return { payment_status: "unpaid", status: "pending", outcome: "pending" };
  }
  return { payment_status: "failed", status: "pending", outcome: "failed" };
}
