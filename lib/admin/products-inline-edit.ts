import type { AdminProductRow } from "@/lib/admin/products-dashboard-types";

export type InlineEditableField = "sku" | "category" | "stock" | "price_egp";

export type ProductPendingEdit = Partial<Record<InlineEditableField, string>>;

export type PendingEditsMap = Record<string, ProductPendingEdit>;

export type PriceAdjustMode = "percent_add" | "percent_subtract" | "set_fixed";

export type SmartBulkRule =
  | { type: "stock_below"; threshold: number; action: "deactivate" | "activate" }
  | { type: "stock_zero"; action: "deactivate" }
  | { type: "out_of_stock"; action: "deactivate" };

export function mergeProductWithPending(
  row: AdminProductRow,
  pending?: ProductPendingEdit,
): AdminProductRow {
  if (!pending || Object.keys(pending).length === 0) return row;
  const next = { ...row };
  if (pending.sku !== undefined) next.sku = pending.sku.trim() || null;
  if (pending.category !== undefined) next.category = pending.category.trim() || null;
  if (pending.stock !== undefined) {
    const n = Number(pending.stock);
    if (Number.isFinite(n) && n >= 0) next.stock = Math.floor(n);
  }
  if (pending.price_egp !== undefined) {
    const n = Number(pending.price_egp);
    if (Number.isFinite(n) && n > 0) next.price_egp = n;
  }
  return next;
}

export function validatePendingEdit(
  field: InlineEditableField,
  raw: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (field === "sku") {
    if (trimmed.length > 80) return { ok: false, message: "SKU طويل جداً (80 حرف كحد أقصى)" };
    return { ok: true, value: trimmed };
  }
  if (field === "category") {
    if (trimmed.length > 100) return { ok: false, message: "التصنيف طويل جداً" };
    return { ok: true, value: trimmed };
  }
  if (field === "stock") {
    if (trimmed === "") return { ok: false, message: "المخزون مطلوب" };
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      return { ok: false, message: "المخزون يجب أن يكون رقماً صحيحاً ≥ 0" };
    }
    return { ok: true, value: String(Math.floor(n)) };
  }
  if (field === "price_egp") {
    if (trimmed === "") return { ok: false, message: "السعر مطلوب" };
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) return { ok: false, message: "السعر يجب أن يكون أكبر من 0" };
    return { ok: true, value: String(n) };
  }
  return { ok: false, message: "حقل غير معروف" };
}

export function buildPatchFromPending(
  pending: ProductPendingEdit,
): { patch: Record<string, unknown> } | { error: string } {
  const patch: Record<string, unknown> = {};
  for (const field of Object.keys(pending) as InlineEditableField[]) {
    const raw = pending[field];
    if (raw === undefined) continue;
    const validated = validatePendingEdit(field, raw);
    if (!validated.ok) return { error: validated.message };
    if (field === "sku") patch.sku = validated.value || null;
    if (field === "category") patch.category = validated.value || null;
    if (field === "stock") patch.stock = Number(validated.value);
    if (field === "price_egp") patch.price_egp = Number(validated.value);
  }
  if (Object.keys(patch).length === 0) return { error: "لا تغييرات للحفظ" };
  return { patch };
}

export function countPendingEdits(map: PendingEditsMap): number {
  return Object.values(map).filter((e) => e && Object.keys(e).length > 0).length;
}

export function applyPriceAdjustment(price: number, mode: PriceAdjustMode, value: number): number {
  if (mode === "set_fixed") return Math.max(0.01, value);
  const delta = (price * value) / 100;
  if (mode === "percent_add") return Math.max(0.01, Math.round((price + delta) * 100) / 100);
  return Math.max(0.01, Math.round((price - delta) * 100) / 100);
}

/** Parse clipboard paste (Excel/Sheets) into cell values */
export function parseClipboardColumn(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.split("\t")[0]?.trim() ?? "")
    .filter((line, i, arr) => line !== "" || i < arr.length - 1);
}

export function smartBulkRuleToPatch(rule: SmartBulkRule): Record<string, unknown> {
  if (rule.action === "deactivate") return { is_active: false };
  return { is_active: true };
}

export function smartBulkRuleLabel(rule: SmartBulkRule, lang: "ar" | "en" = "ar"): string {
  if (lang === "en") {
    if (rule.type === "stock_below") {
      return rule.action === "deactivate"
        ? `Deactivate products with stock < ${rule.threshold}`
        : `Activate products with stock < ${rule.threshold}`;
    }
    if (rule.type === "stock_zero") return "Deactivate out-of-stock products";
    return "Deactivate products with stock ≤ 0";
  }
  if (rule.type === "stock_below") {
    return rule.action === "deactivate"
      ? `إيقاف المنتجات التي مخزونها < ${rule.threshold}`
      : `تفعيل المنتجات التي مخزونها < ${rule.threshold}`;
  }
  if (rule.type === "stock_zero") return "إيقاف المنتجات نفاد المخزون";
  return "إيقاف المنتجات التي مخزونها ≤ 0";
}
