import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchOrderItemsByOrderIds } from "@/lib/db/order-items-fetch";
import type { RawInvoice } from "@/lib/invoices/to-invoice-view-model";
import type { EnsuredInvoice } from "@/lib/invoices/ensure-order-invoice";

function normalizeInvoiceNumber(id: string, issuedAt: string): string {
  const stamp = issuedAt ? issuedAt.slice(0, 10).replaceAll("-", "") : "00000000";
  return `INV-${stamp}-${id.slice(0, 8).toUpperCase()}`;
}

/** Loads invoice + order data for PDF generation and emails. */
export async function fetchRawInvoiceForOrder(
  orderId: string,
  ensured?: EnsuredInvoice | null,
): Promise<RawInvoice | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return null;
  }
  const supabase = createSupabaseAdminClient();

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(
      "id, order_code, status, guest_email, user_id, subtotal_egp, discount_amount_egp, delivery_fee_egp, total_egp, notes, shipping_address, payment_method, paymob_transaction_id, payment_status, created_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) return null;

  let invoiceRow = ensured;
  if (!invoiceRow) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("id, amount, status, issued_at")
      .eq("order_id", orderId)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (inv) {
      const issuedAt = String(inv.issued_at);
      invoiceRow = {
        id: String(inv.id),
        invoiceNumber: normalizeInvoiceNumber(String(inv.id), issuedAt),
        amountEgp: Number(inv.amount),
        status: String(inv.status),
        issuedAt,
        created: false,
      };
    }
  }

  if (!invoiceRow) return null;

  const itemsMap = await fetchOrderItemsByOrderIds(supabase, [orderId]);
  const items = (itemsMap.get(orderId) ?? []).map((it) => ({
    id: it.id,
    product_name: it.product_name,
    quantity: it.quantity,
    unit_price_egp: Number(it.unit_price_egp),
    total_price_egp:
      typeof it.total_price_egp === "number"
        ? it.total_price_egp
        : Number(it.unit_price_egp) * it.quantity,
  }));

  const ship = (order.shipping_address ?? {}) as Record<string, unknown>;
  let customerName = typeof ship.name === "string" ? ship.name : null;
  let customerEmail = order.guest_email as string | null;
  if (order.user_id) {
    const { data: user } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", order.user_id)
      .maybeSingle();
    customerName = user?.full_name ?? customerName;
    customerEmail = user?.email ?? customerEmail;
  }

  return {
    id: invoiceRow.id,
    invoice_number: invoiceRow.invoiceNumber,
    amount_egp: invoiceRow.amountEgp,
    status: invoiceRow.status as RawInvoice["status"],
    issued_at: invoiceRow.issuedAt,
    customer_name: customerName,
    customer_email: customerEmail,
    order: {
      id: order.id as string,
      order_code: (order.order_code as string | null) ?? String(order.id).slice(0, 8),
      status: order.status as string,
      items,
      subtotal_egp: Number(order.subtotal_egp),
      discount_amount_egp: Number(order.discount_amount_egp ?? 0),
      delivery_fee_egp: Number(order.delivery_fee_egp),
      notes: order.notes as string | null,
      shipping_address: ship,
      user_phone: typeof ship.phone === "string" ? ship.phone : null,
    },
    payment: {
      method: (order.payment_method as string) ?? null,
      transaction_id: (order.paymob_transaction_id as string) ?? null,
      status: (order.payment_status as string) ?? null,
      paid_at: invoiceRow.status === "paid" ? invoiceRow.issuedAt : null,
    },
  };
}
