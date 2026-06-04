import { fetchOrderItemsByOrderIds } from "@/lib/db/order-items-fetch";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type CustomerMemorySnapshot = {
  recent_orders: Array<{
    order_code: string | null;
    status: string;
    created_at: string;
    items_summary: string;
  }>;
  note: string;
};

export async function fetchCustomerMemory(
  dbUserId: string | null,
): Promise<CustomerMemorySnapshot | null> {
  if (!dbUserId) return null;

  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_code, status, created_at")
    .eq("user_id", dbUserId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error || !orders?.length) {
    return {
      recent_orders: [],
      note: "No recent orders in memory snapshot.",
    };
  }

  const orderIds = orders.map((o) => String(o.id));
  const itemsByOrder = await fetchOrderItemsByOrderIds(supabase, orderIds);

  const recent_orders = orders.map((o) => {
    const id = String(o.id);
    const items = itemsByOrder.get(id) ?? [];
    const items_summary =
      items.length > 0
        ? items
            .slice(0, 4)
            .map((i) => `${i.product_name}×${i.quantity}`)
            .join(", ")
        : "items unavailable";
    return {
      order_code: o.order_code ? String(o.order_code) : null,
      status: String(o.status ?? "unknown"),
      created_at: String(o.created_at ?? ""),
      items_summary,
    };
  });

  return {
    recent_orders,
    note: "Use for personalization only — do not expose other customers' data.",
  };
}
