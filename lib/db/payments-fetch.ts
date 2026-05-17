import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PaymentRow = {
  id: string;
  order_id: string;
  status: string | null;
  method: string | null;
  transaction_id: string | null;
  created_at: string | null;
};

/** Latest payment per order_id (for invoice list). */
export async function fetchLatestPaymentsByOrderIds(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  orderIds: string[],
): Promise<Map<string, PaymentRow>> {
  const map = new Map<string, PaymentRow>();
  const unique = [...new Set(orderIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from("payments")
    .select("id, order_id, status, method, transaction_id, created_at")
    .in("order_id", unique)
    .order("created_at", { ascending: false });

  if (error) {
    if (!error.message.includes("does not exist")) {
      console.error("[payments-fetch]", error.message);
    }
    return map;
  }

  for (const row of data ?? []) {
    const orderId = String(row.order_id ?? "");
    if (!orderId || map.has(orderId)) continue;
    map.set(orderId, {
      id: String(row.id),
      order_id: orderId,
      status: row.status != null ? String(row.status) : null,
      method: row.method != null ? String(row.method) : null,
      transaction_id: row.transaction_id != null ? String(row.transaction_id) : null,
      created_at: row.created_at != null ? String(row.created_at) : null,
    });
  }
  return map;
}

export function isMissingInvoicesTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    (m.includes("relation") && m.includes("invoices") && m.includes("does not exist")) ||
    (m.includes("schema cache") && m.includes("invoices"))
  );
}
