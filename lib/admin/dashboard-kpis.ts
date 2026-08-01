import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminDashboardKpis = {
  totalRevenue: number;
  ordersToday: number;
  activeOrders: number;
  totalCustomers: number;
  totalProducts: number;
  aov: number;
  fetchedAt: string;
};

function utcStartOfDay(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

/** KPIs for admin home — aligned with CRM (customers only) and paid revenue. */
export async function loadAdminDashboardKpis(): Promise<AdminDashboardKpis> {
  const supabase = createSupabaseAdminClient();
  const startToday = utcStartOfDay();

  const [
    { count: ordersToday = 0 },
    { count: activeOrders = 0 },
    { count: totalCustomers = 0 },
    { count: totalProducts = 0 },
    { data: paidOrders = [] },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startToday),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing", "shipped"]),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer"),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("orders")
      .select("total_egp")
      .eq("payment_status", "paid")
      .limit(8000),
  ]);

  const revenueRows = paidOrders ?? [];
  const totalRevenue = revenueRows.reduce(
    (sum, row) => sum + Number((row as { total_egp?: number }).total_egp ?? 0),
    0,
  );
  const paidCount = revenueRows.length;
  const aov = paidCount > 0 ? totalRevenue / paidCount : 0;

  return {
    totalRevenue,
    ordersToday: ordersToday ?? 0,
    activeOrders: activeOrders ?? 0,
    totalCustomers: totalCustomers ?? 0,
    totalProducts: totalProducts ?? 0,
    aov,
    fetchedAt: new Date().toISOString(),
  };
}
