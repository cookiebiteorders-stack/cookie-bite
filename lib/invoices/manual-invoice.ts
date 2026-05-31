import { z } from "zod";
import { BRAND } from "@/lib/brand";
import type { RawInvoice } from "@/lib/invoices/to-invoice-view-model";

export const INVOICE_LIFECYCLE_STATUSES = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
] as const;

export type InvoiceLifecycleStatus = (typeof INVOICE_LIFECYCLE_STATUSES)[number];

export const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "card",
  "wallet",
  "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type ManualInvoiceLineItem = {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  /** نسبة خصم على البند */
  discount_percent: number;
  tax_rate: number;
};

export type ManualInvoiceDocument = {
  version: 1;
  lifecycle_status: InvoiceLifecycleStatus;
  reference_order_id?: string | null;
  seller: {
    name: string;
    logo_url?: string | null;
    address: string;
    email: string;
    phone: string;
    tax_id: string;
  };
  client: {
    client_id?: string | null;
    name: string;
    company_name?: string;
    email?: string;
    phone?: string;
    billing_address?: string;
    shipping_address?: string;
  };
  items: ManualInvoiceLineItem[];
  summary: {
    invoice_discount_percent: number;
    shipping_fees: number;
    amount_paid: number;
  };
  payment: {
    method: PaymentMethod;
    status: "pending" | "paid" | "partial" | "failed";
    transaction_id?: string;
    payment_date?: string | null;
  };
  notes?: string;
  terms?: string;
};

export type ComputedInvoiceTotals = {
  lines: Array<ManualInvoiceLineItem & { line_subtotal: number; line_discount: number; line_tax: number; line_total: number }>;
  subtotal: number;
  line_discount_total: number;
  invoice_discount: number;
  total_discount: number;
  total_tax: number;
  shipping: number;
  grand_total: number;
  amount_paid: number;
  balance: number;
};

const lineItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  discount_percent: z.number().min(0).max(100).default(0),
  tax_rate: z.number().min(0).max(100).default(0),
});

export const manualInvoiceDocumentSchema = z.object({
  version: z.literal(1).default(1),
  lifecycle_status: z.enum(INVOICE_LIFECYCLE_STATUSES).default("draft"),
  reference_order_id: z.string().uuid().nullable().optional(),
  seller: z.object({
    name: z.string().min(1).max(200),
    logo_url: z.string().max(2000).nullable().optional(),
    address: z.string().max(500),
    email: z.string().max(200),
    phone: z.string().max(80),
    tax_id: z.string().max(80),
  }),
  client: z.object({
    client_id: z.string().uuid().nullable().optional(),
    name: z.string().min(1).max(200),
    company_name: z.string().max(200).optional(),
    email: z.string().max(200).optional(),
    phone: z.string().max(80).optional(),
    billing_address: z.string().max(1000).optional(),
    shipping_address: z.string().max(1000).optional(),
  }),
  items: z.array(lineItemSchema).min(1),
  summary: z.object({
    invoice_discount_percent: z.number().min(0).max(100).default(0),
    shipping_fees: z.number().nonnegative().default(0),
    amount_paid: z.number().nonnegative().default(0),
  }),
  payment: z.object({
    method: z.enum(PAYMENT_METHODS).default("cash"),
    status: z.enum(["pending", "paid", "partial", "failed"]).default("pending"),
    transaction_id: z.string().max(200).optional(),
    payment_date: z.string().nullable().optional(),
  }),
  notes: z.string().max(5000).optional(),
  terms: z.string().max(5000).optional(),
});

export type ParsedManualInvoiceDocument = z.infer<typeof manualInvoiceDocumentSchema>;

/** يطبّع مخرجات Zod إلى شكل `ManualInvoiceDocument` الثابت */
export function normalizeManualDocument(doc: ParsedManualInvoiceDocument): ManualInvoiceDocument {
  return {
    ...doc,
    version: 1,
    client: {
      ...doc.client,
      email: doc.client.email ?? "",
      phone: doc.client.phone ?? "",
      billing_address: doc.client.billing_address ?? "",
    },
  };
}

export const createManualInvoiceSchema = z.object({
  invoice_number: z.string().min(3).max(64).optional(),
  issued_at: z.string().min(1).optional(),
  due_at: z.string().min(1).optional().nullable(),
  currency: z.string().min(3).max(8).default("EGP"),
  order_id: z.string().uuid().nullable().optional(),
  document: manualInvoiceDocumentSchema,
});

export function defaultSeller() {
  return {
    name: "Cookie Bite",
    logo_url: "/brand/logo-mark.svg",
    address: BRAND.location,
    email: BRAND.email,
    phone: BRAND.phoneDisplay,
    tax_id: "",
  };
}

export function emptyManualInvoiceLine(): ManualInvoiceLineItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    tax_rate: 14,
  };
}

export function createEmptyManualInvoiceDocument(): ManualInvoiceDocument {
  return {
    version: 1,
    lifecycle_status: "draft",
    seller: defaultSeller(),
    client: {
      name: "",
      email: "",
      phone: "",
      billing_address: "",
      shipping_address: "",
    },
    items: [emptyManualInvoiceLine()],
    summary: {
      invoice_discount_percent: 0,
      shipping_fees: 0,
      amount_paid: 0,
    },
    payment: {
      method: "cash",
      status: "pending",
    },
    notes: "",
    terms: "الدفع مستحق خلال 7 أيام من تاريخ الفاتورة.",
  };
}

export function computeInvoiceTotals(doc: ManualInvoiceDocument): ComputedInvoiceTotals {
  const lines = doc.items.map((item) => {
    const line_subtotal = item.quantity * item.unit_price;
    const line_discount = line_subtotal * (item.discount_percent / 100);
    const after_discount = line_subtotal - line_discount;
    const line_tax = after_discount * (item.tax_rate / 100);
    const line_total = after_discount + line_tax;
    return { ...item, line_subtotal, line_discount, line_tax, line_total };
  });

  const subtotal = lines.reduce((s, l) => s + l.line_subtotal, 0);
  const line_discount_total = lines.reduce((s, l) => s + l.line_discount, 0);
  const total_tax = lines.reduce((s, l) => s + l.line_tax, 0);
  const after_line_discount = subtotal - line_discount_total;
  const invoice_discount =
    after_line_discount * (doc.summary.invoice_discount_percent / 100);
  const total_discount = line_discount_total + invoice_discount;
  const shipping = doc.summary.shipping_fees;
  const grand_total = Math.max(0, after_line_discount - invoice_discount + total_tax + shipping);
  const amount_paid = doc.summary.amount_paid;
  const balance = Math.max(0, grand_total - amount_paid);

  return {
    lines,
    subtotal,
    line_discount_total,
    invoice_discount,
    total_discount,
    total_tax,
    shipping,
    grand_total,
    amount_paid,
    balance,
  };
}

/** DB status column (legacy) من حالة دورة الفاتورة */
export function lifecycleToDbStatus(lifecycle: InvoiceLifecycleStatus): "pending" | "paid" | "failed" | "refunded" {
  if (lifecycle === "paid") return "paid";
  if (lifecycle === "cancelled") return "failed";
  return "pending";
}

export async function generateInvoiceNumber(
  supabase: ReturnType<typeof import("@/lib/supabase/admin").createSupabaseAdminClient>,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .like("invoice_number", `${prefix}%`);
  const seq = String((count ?? 0) + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}

export function manualDocumentToRawInvoice(input: {
  id: string;
  invoice_number: string;
  amount_egp: number;
  status: "pending" | "paid" | "failed" | "refunded";
  issued_at: string;
  due_at: string | null;
  currency: string;
  document: ManualInvoiceDocument;
  order_id?: string | null;
}): RawInvoice {
  const totals = computeInvoiceTotals(input.document);
  const client = input.document.client;
  const billingLines = client.billing_address
    ? client.billing_address.split(/\n+/).map((l) => l.trim()).filter(Boolean)
    : [];

  return {
    id: input.id,
    invoice_number: input.invoice_number,
    amount_egp: input.amount_egp,
    status: input.status,
    issued_at: input.issued_at,
    due_at: input.due_at,
    customer_name: client.name || null,
    customer_email: client.email || null,
    order: {
      id: input.order_id ?? input.document.reference_order_id ?? null,
      order_code: null,
      status: null,
      items: totals.lines.map((line) => ({
        id: line.id,
        product_name: line.name,
        quantity: line.quantity,
        unit_price_egp: line.unit_price,
        total_price_egp: line.line_total,
      })),
      subtotal_egp: totals.subtotal,
      discount_amount_egp: totals.total_discount,
      delivery_fee_egp: totals.shipping,
      notes: [input.document.notes, input.document.terms].filter(Boolean).join("\n\n") || null,
      shipping_address: billingLines.length
        ? { lines: billingLines, phone: client.phone }
        : null,
      user_phone: client.phone || null,
    },
    payment: {
      method: input.document.payment.method,
      transaction_id: input.document.payment.transaction_id ?? null,
      status: input.document.payment.status,
      paid_at: input.document.payment.payment_date ?? null,
    },
  };
}
