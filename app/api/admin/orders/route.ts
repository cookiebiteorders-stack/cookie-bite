import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import type { AdminOrderRow, OrderStats } from "@/lib/admin/orders-operations-types";

const querySchema = z.object({
  status: z.string().optional(),
  payment_status: z.string().optional(),
  search: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  total_min: z.coerce.number().nonnegative().optional(),
  total_max: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function utcStartOfDay(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

function mapOrderRow(row: Record<string, unknown>): AdminOrderRow {
  const oi = row.order_items as { count?: number }[] | undefined;
  const rawCount = Array.isArray(oi) && oi[0] && typeof oi[0].count === "number" ? oi[0].count : null;
  const rest = { ...row };
  delete rest.order_items;
  return {
    ...(rest as Omit<AdminOrderRow, "items_count">),
    items_count: rawCount ?? 0,
  };
}

async function loadOrderStats(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
): Promise<OrderStats> {
  const now = new Date();
  const startToday = utcStartOfDay(now);
  const startYesterday = new Date(startToday);
  startYesterday.setUTCDate(startYesterday.getUTCDate() - 1);
  const startYesterdayIso = startYesterday.toISOString();

  const [
    { count: pending },
    { count: processing },
    { count: shipped },
    { count: delivered },
    { count: cancelled },
    { count: returned },
    { count: failed_payments },
    { count: orders_today },
    { count: orders_yesterday },
    { data: paidTodayRows },
  ] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "processing"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "shipped"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "refunded"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "failed"),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", startToday),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startYesterdayIso)
      .lt("created_at", startToday),
    supabase
      .from("orders")
      .select("total_egp")
      .eq("payment_status", "paid")
      .gte("created_at", startToday)
      .limit(8000),
  ]);

  const revenue_today_egp = (paidTodayRows ?? []).reduce(
    (s, r) => s + Number((r as { total_egp?: number }).total_egp ?? 0),
    0,
  );

  return {
    pending: pending ?? 0,
    processing: processing ?? 0,
    packed: 0,
    shipped: shipped ?? 0,
    delivered: delivered ?? 0,
    returned: returned ?? 0,
    cancelled: cancelled ?? 0,
    failed_payments: failed_payments ?? 0,
    revenue_today_egp,
    orders_today: orders_today ?? 0,
    orders_yesterday: orders_yesterday ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const actor = await requireAdminAccess("orders");
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid query", "بارامترات غير صالحة"), { status: 400 });
  }

  const q = parsed.data;
  const supabase = createSupabaseAdminClient();

  let db = supabase
    .from("orders")
    .select("*, order_items(count)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (q.status) db = db.eq("status", q.status);
  if (q.payment_status) db = db.eq("payment_status", q.payment_status);
  if (q.search?.trim()) {
    const s = q.search.trim();
    db = db.or(`order_code.ilike.%${s}%,guest_email.ilike.%${s}%`);
  }
  if (q.date_from) db = db.gte("created_at", q.date_from);
  if (q.date_to) db = db.lte("created_at", q.date_to);
  if (typeof q.total_min === "number") db = db.gte("total_egp", q.total_min);
  if (typeof q.total_max === "number") db = db.lte("total_egp", q.total_max);

  const offset = (q.page - 1) * q.limit;
  const [listResult, stats] = await Promise.all([db.range(offset, offset + q.limit - 1), loadOrderStats(supabase)]);

  const { data, error, count } = listResult;
  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  const orders = (data ?? []).map((row) => mapOrderRow(row as Record<string, unknown>));

  return NextResponse.json({
    orders,
    total: count ?? 0,
    page: q.page,
    limit: q.limit,
    stats,
    meta: {
      role: actor.role,
      permission: actor.permission,
      can_write: actor.permission === "full" || actor.permission === "limited",
      can_delete: actor.permission === "full",
    },
  });
}
