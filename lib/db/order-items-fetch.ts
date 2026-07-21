import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type NormalizedOrderItem = {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price_egp: number;
  total_price_egp: number | null;
};

/**
 * يحوّل سجل خام من جدول `order_items` إلى الشكل الموحّد.
 * يدعم البيئات التي لا يوجد فيها عمود `product_name` بقراءة `product_snapshot.name`
 * أو حقول بديلة شائعة.
 */
function normalizeRow(raw: Record<string, unknown>): NormalizedOrderItem {
  const id = String(raw.id ?? "");
  const orderId = String(raw.order_id ?? "");
  const quantity = Number(raw.quantity ?? 0);
  const unitPrice = Number(raw.unit_price_egp ?? raw.unit_price ?? 0);
  const totalRaw = raw.total_price_egp ?? raw.total_price;
  const total = totalRaw == null ? null : Number(totalRaw);

  let name: string | null = null;
  if (typeof raw.product_name === "string" && raw.product_name.trim()) {
    name = raw.product_name;
  } else if (typeof raw.name === "string" && raw.name.trim()) {
    name = raw.name;
  } else if (raw.name && typeof raw.name === "object") {
    const localized = raw.name as Record<string, unknown>;
    if (typeof localized.en === "string" && localized.en.trim()) name = localized.en;
    else if (typeof localized.ar === "string" && localized.ar.trim()) name = localized.ar;
  } else if (typeof raw.product_title === "string" && raw.product_title.trim()) {
    name = raw.product_title;
  } else if (raw.product_snapshot && typeof raw.product_snapshot === "object") {
    const snap = raw.product_snapshot as Record<string, unknown>;
    if (typeof snap.name === "string") name = snap.name;
    else if (typeof snap.title === "string") name = snap.title;
    else if (typeof snap.product_name === "string") name = snap.product_name;
  }

  return {
    id,
    order_id: orderId,
    product_name: name ?? "Unknown item",
    quantity: Number.isFinite(quantity) ? quantity : 0,
    unit_price_egp: Number.isFinite(unitPrice) ? unitPrice : 0,
    total_price_egp: total != null && Number.isFinite(total) ? total : null,
  };
}

/**
 * يجلب بنود الطلبات لمجموعة معرّفات بأسلوب مرن يتجاوز اختلافات المخطط.
 * يستخدم `select("*")` لتجنب أعطال الأعمدة غير الموجودة في بعض البيئات.
 */
export async function fetchOrderItemsByOrderIds(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  orderIds: string[],
): Promise<Map<string, NormalizedOrderItem[]>> {
  const map = new Map<string, NormalizedOrderItem[]>();
  const unique = [...new Set(orderIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", unique);

  if (error) {
    console.error("[order-items-fetch] error:", error.message);
    return map;
  }

  for (const raw of data ?? []) {
    const normalized = normalizeRow(raw as Record<string, unknown>);
    const list = map.get(normalized.order_id) ?? [];
    list.push(normalized);
    map.set(normalized.order_id, list);
  }
  return map;
}
