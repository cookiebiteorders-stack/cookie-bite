import { invoiceNumberFromOrder } from "@/lib/invoices/order-invoice-number";

export type OrderInvoiceIdentity = {
  id: string;
  created_at: string;
  order_code?: string | null;
  order_number?: number | null;
  number?: string | number | null;
};

/** رقم فاتورة مرتبط بالطلب (INV-00000042 من order_code أو number). */
export function resolveInvoiceNumberForOrder(order: OrderInvoiceIdentity): string {
  const legacyNum =
    order.order_number != null && Number.isFinite(Number(order.order_number))
      ? Number(order.order_number)
      : order.number != null && String(order.number).trim() !== ""
        ? Number(order.number)
        : null;

  return invoiceNumberFromOrder({
    id: order.id,
    created_at: order.created_at,
    order_code: order.order_code ?? null,
    order_number: legacyNum != null && Number.isFinite(legacyNum) ? legacyNum : null,
  });
}

export function resolveStoredInvoiceNumber(
  row: { id: string; issued_at?: string | null; created_at?: string | null; invoice_number?: string | null },
  order?: OrderInvoiceIdentity | null,
): string {
  if (typeof row.invoice_number === "string" && row.invoice_number.trim()) {
    return row.invoice_number.trim();
  }
  if (order) {
    return resolveInvoiceNumberForOrder(order);
  }
  const issuedAt =
    (typeof row.issued_at === "string" ? row.issued_at : null) ??
    (typeof row.created_at === "string" ? row.created_at : null) ??
    new Date().toISOString();
  const stamp = issuedAt.slice(0, 10).replaceAll("-", "");
  return `INV-${stamp}-${String(row.id).slice(0, 8).toUpperCase()}`;
}
