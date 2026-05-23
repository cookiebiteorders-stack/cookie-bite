/** رقم فاتورة مشتق من الطلب — بدون الاعتماد على عمود `order_number` */
export function normalizeInvoiceNumberFromId(
  id: string,
  createdAt: string,
  prefix = "INV",
): string {
  const stamp = createdAt ? createdAt.slice(0, 10).replaceAll("-", "") : "00000000";
  return `${prefix}-${stamp}-${id.slice(0, 8).toUpperCase()}`;
}

/** يستخرج لاحقة رقمية من `order_code` مثل CB-20260523-0042 */
export function numericSuffixFromOrderCode(orderCode: string | null | undefined): number | null {
  if (!orderCode || typeof orderCode !== "string") return null;
  const tail = orderCode.match(/(\d+)\s*$/);
  if (!tail) return null;
  const n = Number(tail[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function invoiceNumberFromOrder(input: {
  id: string;
  created_at: string;
  order_code?: string | null;
  order_number?: number | null;
}): string {
  const legacyNum = input.order_number;
  if (legacyNum != null && Number.isFinite(legacyNum) && legacyNum > 0) {
    return `INV-${String(legacyNum).padStart(8, "0")}`;
  }
  const fromCode = numericSuffixFromOrderCode(input.order_code);
  if (fromCode != null) {
    return `INV-${String(fromCode).padStart(8, "0")}`;
  }
  return normalizeInvoiceNumberFromId(input.id, input.created_at);
}

/** نمط INV-00000042 → رقم للبحث في order_code */
export function parseLegacyInvShortNumber(invoiceNumber: string): number | null {
  const m = invoiceNumber.trim().toUpperCase().match(/^INV-(\d{1,12})$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}
