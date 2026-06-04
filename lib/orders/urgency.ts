/** يحدد إن كان الطلب يحتاج أولوية في المطبخ/العمليات. */
export function isUrgentOrder(order: {
  scheduled_delivery_date?: string | null;
  scheduled_delivery_time?: string | null;
  delivery_slot?: string | null;
  notes?: string | null;
  order_type?: string | null;
  status?: string | null;
  created_at?: string;
}): boolean {
  const notes = (order.notes ?? "").toLowerCase();
  if (/urgent|عاجل|asap|فوري|نفس.?اليوم|same.?day/i.test(notes)) {
    return true;
  }

  const slot = (order.delivery_slot ?? "").toLowerCase();
  if (/same|today|اليوم|فوري|urgent|express/i.test(slot)) {
    return true;
  }

  const sched = order.scheduled_delivery_date;
  if (sched) {
    const delivery = new Date(`${sched}T12:00:00`);
    const now = new Date();
    const diffDays = (delivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 1.5) return true;
  }

  if (order.order_type === "gift_box" && order.status === "processing") {
    const created = order.created_at ? new Date(order.created_at) : null;
    if (created) {
      const hours = (Date.now() - created.getTime()) / (1000 * 60 * 60);
      if (hours >= 4 && hours <= 48) return true;
    }
  }

  return false;
}

export function urgencyLabel(urgent: boolean, lang: "ar" | "en" = "ar"): string {
  if (!urgent) return lang === "ar" ? "عادي" : "Normal";
  return lang === "ar" ? "عاجل" : "Urgent";
}
