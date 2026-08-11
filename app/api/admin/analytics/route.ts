import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";

export async function GET() {
  await requireAdminAccess("analytics");

  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      bilingualError("Analytics unavailable (database not configured)", "التحليلات غير متاحة"),
      { status: 503 },
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sel = "id,total_egp,status,created_at";
  const [rAll, rToday, rYesterday] = await Promise.all([
    supabase.from("orders").select(sel).is("deleted_at", null),
    supabase.from("orders").select(sel).gte("created_at", today.toISOString()).is("deleted_at", null),
    supabase
      .from("orders")
      .select(sel)
      .gte("created_at", yesterday.toISOString())
      .lt("created_at", today.toISOString())
      .is("deleted_at", null),
  ]);

  const pickErr = rAll.error ?? rToday.error ?? rYesterday.error;
  if (pickErr) {
    console.error("[api/admin/analytics] orders:", pickErr.message);
    return NextResponse.json(
      {
        ...bilingualError("Could not load analytics", "تعذر تحميل التحليلات"),
        details: pickErr.message,
      },
      { status: 500 },
    );
  }

  const allOrders = rAll.data ?? [];
  const todayOrders = rToday.data ?? [];
  const yesterdayOrders = rYesterday.data ?? [];

  const sum = (arr: Array<{ total_egp: number }>) =>
    arr.reduce((s, o) => s + Number(o.total_egp || 0), 0);

  return NextResponse.json({
    totals: {
      orders: allOrders.length,
      revenue_egp: sum(allOrders),
    },
    today: {
      orders: todayOrders.length,
      revenue_egp: sum(todayOrders),
    },
    yesterday: {
      orders: yesterdayOrders.length,
      revenue_egp: sum(yesterdayOrders),
    },
  });
}
