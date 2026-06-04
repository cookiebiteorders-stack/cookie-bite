/** أعمدة الطلبات المتوافقة مع مخطط الإنتاج (number بدل order_number، gift_message بدل notes). */
export const KITCHEN_ORDER_SELECT =
  "id, order_code, number, status, payment_status, order_type, gift_box_snapshot, recipient_name, scheduled_delivery_date, scheduled_delivery_time, delivery_slot, gift_message, admin_notes, created_at, updated_at, total_egp";

export function resolveOrderDisplayCode(row: Record<string, unknown>): string | null {
  if (typeof row.order_code === "string" && row.order_code.trim()) {
    return row.order_code;
  }
  if (row.number != null && String(row.number).trim()) {
    return String(row.number);
  }
  if (row.order_number != null && String(row.order_number).trim()) {
    return String(row.order_number);
  }
  return null;
}

export function resolveOrderDisplayNumber(row: Record<string, unknown>): string | number | null {
  if (row.number != null) return row.number as string | number;
  if (row.order_number != null) return row.order_number as string | number;
  return null;
}

/** نصوص تُستخدم لتحديد العجلة (notes / gift_message / admin_notes). */
export function resolveOrderUrgencyText(row: Record<string, unknown>): string | null {
  const parts: string[] = [];
  for (const key of ["notes", "gift_message", "admin_notes"] as const) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
  }
  return parts.length ? parts.join(" ") : null;
}

export function orderUrgencyContext(row: Record<string, unknown>) {
  return {
    scheduled_delivery_date:
      typeof row.scheduled_delivery_date === "string" ? row.scheduled_delivery_date : null,
    scheduled_delivery_time:
      typeof row.scheduled_delivery_time === "string" ? row.scheduled_delivery_time : null,
    delivery_slot: typeof row.delivery_slot === "string" ? row.delivery_slot : null,
    notes: resolveOrderUrgencyText(row),
    order_type: typeof row.order_type === "string" ? row.order_type : null,
    status: typeof row.status === "string" ? row.status : null,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}
