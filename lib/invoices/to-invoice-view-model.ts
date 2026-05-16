import type {
  InvoiceItem,
  InvoiceStatus,
  InvoiceViewModel,
} from "@/components/invoices/invoice-view";

/** الشكل المنخفض القادم من API الإدارة (يطابق `Invoice` في `app/(admin)/admin/invoices/page.tsx`). */
export type RawInvoice = {
  id: string;
  invoice_number: string;
  amount_egp: number;
  status: InvoiceStatus;
  issued_at: string;
  customer_name: string | null;
  customer_email: string | null;
  order: {
    id: string | null;
    order_code: string | null;
    status?: string | null;
    items: Array<{
      id: string;
      product_name: string;
      quantity: number;
      unit_price_egp: number;
      total_price_egp?: number | null;
    }>;
    subtotal_egp?: number | null;
    discount_amount_egp?: number | null;
    delivery_fee_egp?: number | null;
    notes?: string | null;
    shipping_address?: Record<string, unknown> | null;
    user_phone?: string | null;
  };
  payment: {
    id?: string | null;
    method: string | null;
    transaction_id: string | null;
    status?: string | null;
    paid_at?: string | null;
  };
};

function moneyOrZero(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function paymentMethodLabel(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.toLowerCase();
  if (value.includes("cash")) return "Cash on Delivery";
  if (value.includes("card") || value.includes("paymob") || value.includes("stripe")) {
    return "Card Payment";
  }
  return raw;
}

function buildAddressLines(
  address: Record<string, unknown> | null | undefined,
): string[] {
  if (!address) return [];
  const lines: string[] = [];
  const street = (address.street ?? address.line1 ?? address.address) as
    | string
    | undefined;
  const apt = (address.apartment ?? address.apt ?? address.line2) as
    | string
    | undefined;
  const district = (address.district ?? address.area) as string | undefined;
  const city = address.city as string | undefined;
  const country = address.country as string | undefined;

  if (street) lines.push(apt ? `${street}, ${apt}` : street);
  if (district) lines.push(district);
  if (city || country) {
    lines.push([city, country].filter(Boolean).join(", "));
  }
  return lines;
}

/**
 * يحوّل سجل الفاتورة الخام إلى نموذج عرض كامل للقالب الفاخر.
 * يحسب المجاميع الفرعية من البنود إن لم تكن متوفرة على مستوى الطلب.
 */
export function toInvoiceViewModel(raw: RawInvoice): InvoiceViewModel {
  const items: InvoiceItem[] = (raw.order.items ?? []).map((item) => {
    const lineTotal =
      typeof item.total_price_egp === "number" && Number.isFinite(item.total_price_egp)
        ? item.total_price_egp
        : moneyOrZero(item.unit_price_egp) * moneyOrZero(item.quantity);
    return {
      id: item.id,
      product_name: item.product_name,
      quantity: moneyOrZero(item.quantity),
      unit_price_egp: moneyOrZero(item.unit_price_egp),
      total_price_egp: lineTotal,
    };
  });

  const computedSubtotal = items.reduce(
    (sum, item) => sum + (item.total_price_egp ?? 0),
    0,
  );
  const subtotal =
    typeof raw.order.subtotal_egp === "number" && Number.isFinite(raw.order.subtotal_egp)
      ? raw.order.subtotal_egp
      : computedSubtotal;

  const discount = moneyOrZero(raw.order.discount_amount_egp);
  const shipping = moneyOrZero(raw.order.delivery_fee_egp);
  const total = moneyOrZero(raw.amount_egp);
  const tax = Math.max(0, total - subtotal + discount - shipping);

  const customerAddress = buildAddressLines(raw.order.shipping_address ?? null);

  return {
    invoice_number: raw.invoice_number,
    order_number: raw.order.order_code ?? raw.order.id ?? null,
    issued_at: raw.issued_at,
    due_at: raw.payment?.paid_at ?? raw.issued_at,
    status: raw.status,
    customer_name: raw.customer_name,
    customer_email: raw.customer_email,
    customer_phone:
      typeof raw.order.user_phone === "string" ? raw.order.user_phone : null,
    customer_address_lines: customerAddress,
    items,
    subtotal_egp: subtotal,
    discount_amount_egp: discount,
    shipping_amount_egp: shipping,
    tax_amount_egp: tax,
    total_amount_egp: total,
    payment_method: paymentMethodLabel(raw.payment?.method ?? null),
    transaction_id: raw.payment?.transaction_id ?? null,
    notes: raw.order.notes ?? null,
  };
}
