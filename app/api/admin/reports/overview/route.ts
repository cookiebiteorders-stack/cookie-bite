import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";

type OrderLite = { total_egp: number; status: string; created_at: string };
type OrderItemLite = { product_name: string; quantity: number; total_price_egp: number | null };

export async function GET() {
  await requireAdminAccess("analytics");
  const supabase = createSupabaseAdminClient();

  const now = new Date();
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);

  const [{ data: orders }, { data: items }, { count: customersCount }] = await Promise.all([
    supabase
      .from("orders")
      .select("total_egp,status,created_at")
      .gte("created_at", d30.toISOString()),
    supabase
      .from("order_items")
      .select("product_name,quantity,total_price_egp")
      .gte("created_at", d30.toISOString()),
    supabase.from("users").select("id", { head: true, count: "exact" }).eq("role", "customer"),
  ]);

  if (!orders || !items) {
    return NextResponse.json(
      bilingualError("Could not load analytics", "تعذر تحميل التحليلات"),
      { status: 500 },
    );
  }

  const ordersTyped = orders as OrderLite[];
  const itemsTyped = items as OrderItemLite[];

  const revenue30 = ordersTyped.reduce((s, o) => s + Number(o.total_egp || 0), 0);
  const totalOrders30 = ordersTyped.length;
  const aov30 = totalOrders30 > 0 ? revenue30 / totalOrders30 : 0;
  const statusCounts = ordersTyped.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const productMap = new Map<string, { qty: number; revenue: number }>();
  for (const i of itemsTyped) {
    const key = i.product_name || "Unknown";
    const prev = productMap.get(key) ?? { qty: 0, revenue: 0 };
    prev.qty += Number(i.quantity || 0);
    prev.revenue += Number(i.total_price_egp || 0);
    productMap.set(key, prev);
  }

  const topProducts = [...productMap.entries()]
    .map(([name, v]) => ({ name, quantity: v.qty, revenue_egp: v.revenue }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  return NextResponse.json({
    kpis: {
      revenue_30d_egp: revenue30,
      orders_30d: totalOrders30,
      aov_30d_egp: aov30,
      customers_total: customersCount ?? 0,
    },
    order_status_breakdown: statusCounts,
    top_products: topProducts,
  });
}

