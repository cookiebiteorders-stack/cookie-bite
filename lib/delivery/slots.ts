import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type DeliverySlotAvailability = {
  id: string;
  label: string;
  label_ar: string | null;
  start_time: string;
  end_time: string;
  max_orders_per_slot: number;
  booked_count: number;
  available: number;
  is_full: boolean;
};

type SlotRow = {
  id: string;
  label: string;
  label_ar: string | null;
  start_time: string;
  end_time: string;
  max_orders_per_slot: number;
  available_days: number[];
  sort_order: number;
};

const FALLBACK_SLOTS: SlotRow[] = [
  {
    id: "fallback-morning",
    label: "Morning 9:00 – 12:00",
    label_ar: "صباحاً 9:00 – 12:00",
    start_time: "09:00:00",
    end_time: "12:00:00",
    max_orders_per_slot: 20,
    available_days: [0, 1, 2, 3, 4, 5, 6],
    sort_order: 1,
  },
  {
    id: "fallback-midday",
    label: "Midday 12:00 – 3:00",
    label_ar: "ظهراً 12:00 – 3:00",
    start_time: "12:00:00",
    end_time: "15:00:00",
    max_orders_per_slot: 20,
    available_days: [0, 1, 2, 3, 4, 5, 6],
    sort_order: 2,
  },
  {
    id: "fallback-afternoon",
    label: "Afternoon 3:00 – 6:00",
    label_ar: "عصراً 3:00 – 6:00",
    start_time: "15:00:00",
    end_time: "18:00:00",
    max_orders_per_slot: 20,
    available_days: [0, 1, 2, 3, 4, 5, 6],
    sort_order: 3,
  },
  {
    id: "fallback-evening",
    label: "Evening 6:00 – 9:00",
    label_ar: "مساءً 6:00 – 9:00",
    start_time: "18:00:00",
    end_time: "21:00:00",
    max_orders_per_slot: 20,
    available_days: [0, 1, 2, 3, 4, 5, 6],
    sort_order: 4,
  },
];

function parseDeliveryDate(date: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function listDeliverySlotsForDate(
  date: string,
): Promise<{ slots: DeliverySlotAvailability[]; day_of_week: number }> {
  const parsed = parseDeliveryDate(date);
  if (!parsed) {
    return { slots: [], day_of_week: -1 };
  }
  const dayOfWeek = parsed.getDay();

  let rows: SlotRow[] = [];
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("delivery_time_slots")
      .select("id, label, label_ar, start_time, end_time, max_orders_per_slot, available_days, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!error && data?.length) {
      rows = (data as SlotRow[]).filter((slot) =>
        Array.isArray(slot.available_days) ? slot.available_days.includes(dayOfWeek) : true,
      );
    }
  } catch {
    rows = [];
  }

  if (!rows.length) {
    rows = FALLBACK_SLOTS.filter((slot) => slot.available_days.includes(dayOfWeek));
  }

  const slotIds = rows.map((r) => r.id).filter((id) => !id.startsWith("fallback-"));
  const counts = new Map<string, number>();

  if (slotIds.length) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data: bookings } = await supabase
        .from("slot_bookings")
        .select("slot_id")
        .eq("delivery_date", date)
        .in("slot_id", slotIds);
      for (const row of bookings ?? []) {
        const id = (row as { slot_id: string }).slot_id;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    } catch {
      // table may not exist yet
    }
  }

  const slots: DeliverySlotAvailability[] = rows.map((slot) => {
    const booked = counts.get(slot.id) ?? 0;
    const max = slot.max_orders_per_slot;
    const available = Math.max(0, max - booked);
    return {
      id: slot.id,
      label: slot.label,
      label_ar: slot.label_ar,
      start_time: slot.start_time,
      end_time: slot.end_time,
      max_orders_per_slot: max,
      booked_count: booked,
      available,
      is_full: available <= 0,
    };
  });

  return { slots, day_of_week: dayOfWeek };
}

export async function getSlotStartTime(slotId: string): Promise<string | null> {
  if (slotId.startsWith("fallback-")) {
    const row = FALLBACK_SLOTS.find((s) => s.id === slotId);
    return row?.start_time ?? null;
  }
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("delivery_time_slots")
      .select("start_time")
      .eq("id", slotId)
      .maybeSingle();
    return (data as { start_time?: string } | null)?.start_time ?? null;
  } catch {
    return null;
  }
}

export async function assertSlotAvailable(slotId: string, deliveryDate: string): Promise<void> {
  if (slotId.startsWith("fallback-")) return;
  const { slots } = await listDeliverySlotsForDate(deliveryDate);
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) {
    throw new Error("SLOT_NOT_FOUND");
  }
  if (slot.is_full) {
    throw new Error("SLOT_FULL");
  }
}

export async function bookDeliverySlot(params: {
  orderId: string;
  slotId: string;
  deliveryDate: string;
}): Promise<void> {
  if (params.slotId.startsWith("fallback-")) return;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("slot_bookings").insert({
    slot_id: params.slotId,
    order_id: params.orderId,
    delivery_date: params.deliveryDate,
  });
  if (error) {
    console.error("bookDeliverySlot", error);
    throw new Error("BOOKING_FAILED");
  }
}
