import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminDashboardHome } from "@/components/admin/admin-dashboard-home";

export default async function AdminHomePage() {
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const [
    { count: ordersToday = 0 },
    { count: activeOrders = 0 },
    { count: totalCustomers = 0 },
    { count: totalProducts = 0 },
    { data: revenueRows = [] },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString()),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing", "shipped"]),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("total_egp"),
  ]);

  const revenueData = revenueRows ?? [];
  const totalRevenue = revenueData.reduce(
    (sum, row) => sum + Number((row as { total_egp?: number }).total_egp ?? 0),
    0,
  );
  const aov = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;

  return (
    <AdminDashboardHome
      totalRevenue={totalRevenue}
      ordersToday={ordersToday ?? 0}
      activeOrders={activeOrders ?? 0}
      totalCustomers={totalCustomers ?? 0}
      totalProducts={totalProducts ?? 0}
      aov={aov}
    />
  );
}
