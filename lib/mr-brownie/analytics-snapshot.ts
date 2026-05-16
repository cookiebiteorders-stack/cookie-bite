import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminAnalyticsSnapshot = {
  today_orders: number;
  today_revenue_egp: number;
  week_orders: number;
  week_revenue_egp: number;
  top_product_names_week: string[];
  pending_orders: number;
};

/**
 * لقطات تشغيلية خفيفة للإدارة — بدون جلسات أو معدلات تحويل حتى يتوفر التتبع.
 */
export async function fetchAdminAnalyticsSnapshot(): Promise<AdminAnalyticsSnapshot | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startWeek = new Date(now);
  startWeek.setDate(startWeek.getDate() - 7);

  const dayIso = startToday.toISOString();
  const weekIso = startWeek.toISOString();

  const [{ count: pendingOrders }, { data: todayRows, error: e1 }, { data: weekOrderRows, error: e2 }] =
    await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("total_egp").gte("created_at", dayIso),
      supabase.from("orders").select("id, total_egp").gte("created_at", weekIso),
    ]);

  if (e1 || e2) {
    console.warn("mr-brownie analytics snapshot", e1 ?? e2);
    return null;
  }

  const todayOrders = todayRows ?? [];
  const weekOrders = weekOrderRows ?? [];

  const today_revenue_egp = todayOrders.reduce(
    (s, r) => s + Number((r as { total_egp?: number }).total_egp ?? 0),
    0,
  );
  const week_revenue_egp = weekOrders.reduce(
    (s, r) => s + Number((r as { total_egp?: number }).total_egp ?? 0),
    0,
  );

  const weekIds = weekOrders
    .map((r) => (r as { id?: string }).id)
    .filter((id): id is string => typeof id === "string");

  const productCounts = new Map<string, number>();
  if (weekIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, quantity")
      .in("order_id", weekIds.slice(0, 500));

    for (const row of items ?? []) {
      const n = (row as { product_name?: string }).product_name?.trim();
      const q = Number((row as { quantity?: number }).quantity ?? 1);
      if (!n) continue;
      productCounts.set(n, (productCounts.get(n) ?? 0) + q);
    }
  }

  const top_product_names_week = [...productCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  return {
    today_orders: todayOrders.length,
    today_revenue_egp,
    week_orders: weekOrders.length,
    week_revenue_egp,
    top_product_names_week,
    pending_orders: pendingOrders ?? 0,
  };
}
