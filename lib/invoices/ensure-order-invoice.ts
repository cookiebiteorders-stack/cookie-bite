import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type EnsuredInvoice = {
  id: string;
  invoiceNumber: string;
  amountEgp: number;
  status: string;
  issuedAt: string;
  created: boolean;
};

function normalizeInvoiceNumber(id: string, issuedAt: string): string {
  const stamp = issuedAt ? issuedAt.slice(0, 10).replaceAll("-", "") : "00000000";
  return `INV-${stamp}-${id.slice(0, 8).toUpperCase()}`;
}

/**
 * Ensures a paid invoice row exists for an order (idempotent).
 */
export async function ensurePaidInvoiceForOrder(
  orderId: string,
  amountEgp: number,
): Promise<EnsuredInvoice | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return null;
  }
  const supabase = createSupabaseAdminClient();

  const { data: existing } = await supabase
    .from("invoices")
    .select("id, amount, status, issued_at")
    .eq("order_id", orderId)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const issuedAt = String(existing.issued_at);
    return {
      id: String(existing.id),
      invoiceNumber: normalizeInvoiceNumber(String(existing.id), issuedAt),
      amountEgp: Number(existing.amount),
      status: String(existing.status),
      issuedAt,
      created: false,
    };
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      order_id: orderId,
      amount: amountEgp,
      status: "paid",
    })
    .select("id, amount, status, issued_at")
    .single();

  if (error || !data) {
    console.error("[ensurePaidInvoiceForOrder]", error?.message);
    return null;
  }

  const issuedAt = String(data.issued_at);
  return {
    id: String(data.id),
    invoiceNumber: normalizeInvoiceNumber(String(data.id), issuedAt),
    amountEgp: Number(data.amount),
    status: String(data.status),
    issuedAt,
    created: true,
  };
}
