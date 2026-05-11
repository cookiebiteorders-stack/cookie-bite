import type { PaymentTransactionRow } from "@/lib/payments/payment-summary-types";

export function inferGateway(row: PaymentTransactionRow): string {
  if (row.paymob_transaction_id || row.paymob_accept_order_id != null) {
    return "Paymob Accept";
  }
  const pm = (row.payment_method ?? "").toLowerCase();
  if (/vodafone|meeza|meza|wallet|fawry|instapay|apple|google|card|online/i.test(pm)) {
    return "Paymob / digital";
  }
  if (/cash|cod|manual|transfer|bank|تحويل|نقد/i.test(pm)) {
    return "Manual / COD";
  }
  return "Checkout";
}
