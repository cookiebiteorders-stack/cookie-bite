import {
  type ManualInvoiceDocument,
  createEmptyManualInvoiceDocument,
  emptyManualInvoiceLine,
  type InvoiceLifecycleStatus,
} from "@/lib/invoices/manual-invoice";

function dbStatusToLifecycle(status: string): InvoiceLifecycleStatus {
  const s = status.toLowerCase();
  if (s === "paid") return "paid";
  if (s === "failed") return "cancelled";
  if (s === "refunded") return "cancelled";
  return "draft";
}

/** يبني مستند فاتورة يدوي من صف قديم بلا عمود `document` */
export function legacyInvoiceToDocument(input: {
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  order_id?: string | null;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price_egp: number;
  }>;
  payment_method?: string | null;
  payment_status?: string | null;
  amount_paid?: number;
}): ManualInvoiceDocument {
  const base = createEmptyManualInvoiceDocument();
  const lifecycle = dbStatusToLifecycle(input.status);

  return {
    ...base,
    lifecycle_status: lifecycle,
    reference_order_id: input.order_id ?? null,
    client: {
      ...base.client,
      name: input.customer_name?.trim() || "Guest",
      email: input.customer_email ?? "",
    },
    items:
      input.items.length > 0
        ? input.items.map((item) => ({
            id: item.id,
            name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price_egp,
            discount_percent: 0,
            tax_rate: 14,
          }))
        : [emptyManualInvoiceLine()],
    summary: {
      ...base.summary,
      amount_paid: input.amount_paid ?? (lifecycle === "paid" ? 0 : 0),
    },
    payment: {
      method: "cash",
      status:
        lifecycle === "paid"
          ? "paid"
          : input.payment_status === "paid"
            ? "paid"
            : "pending",
      transaction_id: undefined,
    },
  };
}
