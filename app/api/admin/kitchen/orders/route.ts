import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { parseGiftBoxSnapshot } from "@/lib/gift-box/order-snapshot";
import {
  KITCHEN_ORDER_SELECT,
  orderUrgencyContext,
  resolveOrderDisplayCode,
  resolveOrderDisplayNumber,
} from "@/lib/orders/order-row-compat";
import { isUrgentOrder } from "@/lib/orders/urgency";
import { bilingualError } from "@/lib/validations";

const querySchema = z.object({
  status: z.enum(["processing", "shipped", "delivered", "all"]).optional().default("all"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export async function GET(req: NextRequest) {
  await requireAdminAccess("orders");
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid query", "استعلام غير صالح"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  let q = supabase
    .from("orders")
    .select(KITCHEN_ORDER_SELECT)
    .eq("order_type", "gift_box")
    .in("payment_status", ["paid", "unpaid"])
    .order("created_at", { ascending: false })
    .limit(parsed.data.limit);

  if (parsed.data.status !== "all") {
    q = q.eq("status", parsed.data.status);
  } else {
    q = q.in("status", ["processing", "pending", "shipped"]);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[admin/kitchen/orders] GET", error);
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  const orders = (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>;
    const snapshot = parseGiftBoxSnapshot(row.gift_box_snapshot);
    return {
      id: row.id,
      order_code: resolveOrderDisplayCode(raw),
      order_number: resolveOrderDisplayNumber(raw),
      status: row.status,
      payment_status: row.payment_status,
      order_type: row.order_type,
      recipient_name: row.recipient_name,
      scheduled_delivery_date: row.scheduled_delivery_date,
      gift_box_snapshot: snapshot,
      item_count: snapshot?.totalItems ?? snapshot?.items?.length ?? 0,
      urgent: isUrgentOrder(orderUrgencyContext(raw)),
      created_at: row.created_at,
      total_egp: Number(row.total_egp ?? 0),
    };
  });

  const counts = {
    pending: orders.filter((o) => o.status === "processing" || o.status === "pending").length,
    ready: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    urgent: orders.filter((o) => o.urgent).length,
  };

  return NextResponse.json({ orders, counts });
}
