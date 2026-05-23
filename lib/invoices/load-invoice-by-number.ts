import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvoiceDetailPayload } from "@/lib/invoices/invoice-detail-types";
import {
  type ManualInvoiceDocument,
  manualDocumentToRawInvoice,
} from "@/lib/invoices/manual-invoice";
import { toInvoiceStatus } from "@/lib/invoices/map-invoice-row";

function parseManualDocument(raw: unknown): ManualInvoiceDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as ManualInvoiceDocument;
  if (doc.version !== 1 || !Array.isArray(doc.items) || doc.items.length === 0) return null;
  return doc;
}

/** تحميل فاتورة يدوية برقمها المخزَّن (INV-2026-0001) */
export async function loadManualInvoiceByStoredNumber(
  supabase: SupabaseClient,
  invoiceNumber: string,
): Promise<InvoiceDetailPayload | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, order_id, amount, status, issued_at, created_at, invoice_number, due_at, currency, document")
    .eq("invoice_number", invoiceNumber)
    .maybeSingle();

  if (error || !data) return null;
  const doc = parseManualDocument(data.document);
  if (!doc) return null;

  const issuedAt = String(data.issued_at ?? data.created_at ?? new Date().toISOString());
  const raw = manualDocumentToRawInvoice({
    id: String(data.id),
    invoice_number: String(data.invoice_number ?? invoiceNumber),
    amount_egp: Number(data.amount ?? 0),
    status: toInvoiceStatus(data.status),
    issued_at: issuedAt,
    due_at: typeof data.due_at === "string" ? data.due_at : null,
    currency: typeof data.currency === "string" ? data.currency : "EGP",
    document: doc,
    order_id: data.order_id,
  });

  return {
    id: raw.id,
    invoice_number: raw.invoice_number,
    amount_egp: raw.amount_egp,
    status: raw.status,
    issued_at: raw.issued_at,
    customer_name: raw.customer_name,
    customer_email: raw.customer_email,
    order: {
      id: raw.order.id,
      order_code: raw.order.order_code,
      status: raw.order.status ?? null,
      items: raw.order.items.map((item) => ({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price_egp: item.unit_price_egp,
        total_price_egp: item.total_price_egp ?? null,
      })),
      subtotal_egp: raw.order.subtotal_egp ?? null,
      discount_amount_egp: raw.order.discount_amount_egp ?? null,
      delivery_fee_egp: raw.order.delivery_fee_egp ?? null,
      notes: raw.order.notes ?? null,
      shipping_address: raw.order.shipping_address ?? null,
    },
    payment: {
      id: raw.payment.id ?? null,
      method: raw.payment.method,
      transaction_id: raw.payment.transaction_id,
      status: raw.payment.status ?? null,
      paid_at: raw.payment.paid_at ?? null,
    },
  };
}
