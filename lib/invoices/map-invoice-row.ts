import type { InvoiceApiRow } from "@/lib/invoices/admin-invoice-types";
import {
  type ManualInvoiceDocument,
  computeInvoiceTotals,
  lifecycleToDbStatus,
  manualDocumentToRawInvoice,
} from "@/lib/invoices/manual-invoice";
import type { RawInvoice } from "@/lib/invoices/to-invoice-view-model";

type DbInvoiceRow = {
  id: string;
  order_id: string | null;
  amount: number;
  status: string;
  issued_at: string | null;
  created_at: string | null;
  invoice_number?: string | null;
  due_at?: string | null;
  currency?: string | null;
  document?: unknown;
};

function normalizeInvoiceNumber(id: string, createdAt: string): string {
  const stamp = createdAt ? createdAt.slice(0, 10).replaceAll("-", "") : "00000000";
  return `INV-${stamp}-${id.slice(0, 8).toUpperCase()}`;
}

function toInvoiceStatus(raw: unknown): InvoiceApiRow["status"] {
  const value = typeof raw === "string" ? raw.toLowerCase() : "";
  if (value === "paid") return "paid";
  if (value === "failed") return "failed";
  if (value === "refunded") return "refunded";
  return "pending";
}

function parseDocument(raw: unknown): ManualInvoiceDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as ManualInvoiceDocument;
  if (doc.version !== 1 || !Array.isArray(doc.items) || doc.items.length === 0) return null;
  return doc;
}

export function invoiceRowToApiPayload(
  row: DbInvoiceRow,
  order?: Record<string, unknown> | null,
  user?: { full_name: string | null; email: string | null } | null,
  items?: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price_egp: number;
    total_price_egp?: number | null;
  }>,
  payment?: {
    id?: string | null;
    method?: string | null;
    transaction_id?: string | null;
    status?: string | null;
    created_at?: string | null;
  } | null,
): InvoiceApiRow {
  const issuedAt =
    (typeof row.issued_at === "string" ? row.issued_at : null) ??
    (typeof row.created_at === "string" ? row.created_at : null) ??
    new Date().toISOString();
  const invoiceNumber =
    typeof row.invoice_number === "string" && row.invoice_number.trim()
      ? row.invoice_number.trim()
      : normalizeInvoiceNumber(String(row.id), issuedAt);

  const manualDoc = parseDocument(row.document);
  if (manualDoc) {
    const raw = manualDocumentToRawInvoice({
      id: String(row.id),
      invoice_number: invoiceNumber,
      amount_egp: Number(row.amount ?? 0),
      status: toInvoiceStatus(row.status),
      issued_at: issuedAt,
      due_at: typeof row.due_at === "string" ? row.due_at : null,
      currency: row.currency ?? "EGP",
      document: manualDoc,
      order_id: row.order_id,
    });
    return rawInvoiceToApiRow(
      raw,
      manualDoc.lifecycle_status,
      typeof row.due_at === "string" ? row.due_at : null,
      row.currency ?? "EGP",
    );
  }

  const orderId = typeof order?.id === "string" ? order.id : row.order_id;
  return {
    id: String(row.id),
    invoice_number: invoiceNumber,
    amount_egp: Number(row.amount ?? 0),
    status: toInvoiceStatus(row.status),
    issued_at: issuedAt,
    customer_name: typeof user?.full_name === "string" ? user.full_name : null,
    customer_email:
      typeof user?.email === "string"
        ? user.email
        : typeof order?.guest_email === "string"
          ? order.guest_email
          : null,
    order: {
      id: orderId ?? null,
      order_code: typeof order?.order_code === "string" ? order.order_code : null,
      status: typeof order?.status === "string" ? order.status : null,
      items: (items ?? []).map((item) => ({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price_egp: item.unit_price_egp,
      })),
    },
    payment: {
      id: payment?.id ?? null,
      method: payment?.method ?? null,
      transaction_id: payment?.transaction_id ?? null,
      status: payment?.status ?? null,
      paid_at: payment?.created_at ?? null,
    },
    is_manual: false,
    is_editable: true,
    lifecycle_status: null,
    currency: row.currency ?? "EGP",
    due_at: row.due_at ?? null,
  };
}

function rawInvoiceToApiRow(
  raw: RawInvoice,
  lifecycle: ManualInvoiceDocument["lifecycle_status"],
  dueAt: string | null,
  currency: string,
): InvoiceApiRow {
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
      items: raw.order.items,
    },
    payment: {
      id: raw.payment.id ?? null,
      method: raw.payment.method,
      transaction_id: raw.payment.transaction_id,
      status: raw.payment.status ?? null,
      paid_at: raw.payment.paid_at ?? null,
    },
    is_manual: true,
    is_editable: true,
    lifecycle_status: lifecycle,
    currency,
    due_at: dueAt,
  };
}

export function documentGrandTotal(doc: ManualInvoiceDocument): number {
  return computeInvoiceTotals(doc).grand_total;
}

export { lifecycleToDbStatus, toInvoiceStatus };
