import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";

export async function GET() {
  await requireAdminAccess("analytics");
  const supabase = createSupabaseAdminClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [{ data: allOrders }, { data: todayOrders }, { data: yesterdayOrders }] =
    await Promise.all([
      supabase.from("orders").select("id,total_egp,status,created_at"),
      supabase
        .from("orders")
        .select("id,total_egp,status,created_at")
        .gte("created_at", today.toISOString()),
      supabase
        .from("orders")
        .select("id,total_egp,status,created_at")
        .gte("created_at", yesterday.toISOString())
        .lt("created_at", today.toISOString()),
    ]);

  if (!allOrders || !todayOrders || !yesterdayOrders) {
    return NextResponse.json(
      bilingualError("Could not load analytics", "تعذر تحميل التحليلات"),
      { status: 500 },
    );
  }

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
