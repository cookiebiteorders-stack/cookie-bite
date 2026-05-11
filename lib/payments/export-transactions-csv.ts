import type { PaymentTransactionRow } from "@/lib/payments/payment-summary-types";
import { inferGateway } from "@/lib/payments/infer-gateway";
import { maskEmail, shortId } from "@/lib/payments/mask-pii";

function esc(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function transactionsToCsv(rows: PaymentTransactionRow[]): string {
  const header =
    "id,order_code,guest_email,user_id,total_egp,payment_status,payment_method,gateway_inferred,paymob_transaction_id,created_at";
  const lines = rows.map((r) => {
    const gw = inferGateway(r);
    return [
      esc(r.id),
      esc(r.order_code ?? ""),
      esc(maskEmail(r.guest_email)),
      esc(r.user_id ? shortId(r.user_id, 12) : ""),
      r.total_egp,
      esc(r.payment_status),
      esc(r.payment_method ?? ""),
      esc(gw),
      esc(r.paymob_transaction_id ?? ""),
      esc(r.created_at),
    ].join(",");
  });
  return `\ufeff${header}\n${lines.join("\n")}\n`;
}
