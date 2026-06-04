import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchOrderItemsByOrderIds } from "@/lib/db/order-items-fetch";
import type { RawInvoice } from "@/lib/invoices/to-invoice-view-model";
import type { EnsuredInvoice } from "@/lib/invoices/ensure-order-invoice";
import { ORDER_FOR_INVOICE_SELECT } from "@/lib/invoices/order-select";
import {
  resolveStoredInvoiceNumber,
  type OrderInvoiceIdentity,
} from "@/lib/invoices/resolve-invoice-number";
import { resolveOrderDisplayCode } from "@/lib/orders/order-row-compat";

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
    .select(ORDER_FOR_INVOICE_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) return null;

  let invoiceRow = ensured;
  if (!invoiceRow) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("id, amount, status, issued_at, created_at, invoice_number")
      .eq("order_id", orderId)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (inv) {
      const issuedAt = String(inv.issued_at);
      invoiceRow = {
        id: String(inv.id),
        invoiceNumber: resolveStoredInvoiceNumber(
          inv,
          order as OrderInvoiceIdentity,
        ),
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
  const orderRaw = order as Record<string, unknown>;
  let customerName =
    (typeof orderRaw.full_name === "string" ? orderRaw.full_name : null) ||
    (typeof ship.name === "string" ? ship.name : null) ||
    (typeof ship.recipient === "string" ? ship.recipient : null);
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

  const orderCode =
    resolveOrderDisplayCode(orderRaw) ?? String(order.id).slice(0, 8);
  const notes =
    (typeof orderRaw.gift_message === "string" ? orderRaw.gift_message : null) ||
    (typeof orderRaw.admin_notes === "string" ? orderRaw.admin_notes : null);

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
      order_code: orderCode,
      status: order.status as string,
      items,
      subtotal_egp: Number(order.subtotal_egp),
      discount_amount_egp: Number(order.discount_amount_egp ?? 0),
      delivery_fee_egp: Number(order.delivery_fee_egp),
      notes,
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
