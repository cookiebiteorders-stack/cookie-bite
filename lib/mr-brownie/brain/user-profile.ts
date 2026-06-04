import { fetchCustomerMemory } from "@/lib/mr-brownie/fetch-customer-memory";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type UserProfileSnapshot = {
  display_name: string | null;
  preferred_categories: string[];
  favorite_product_names: string[];
  order_count: number;
  last_order_hint: string | null;
  budget_signal: "low" | "medium" | "high" | "unknown";
  sales_hooks: string[];
};

export async function buildUserProfileSnapshot(params: {
  dbUserId: string | null;
  displayName: string | null;
  loyaltyTier: string | null;
}): Promise<UserProfileSnapshot | null> {
  if (!params.dbUserId) return null;

  const memory = await fetchCustomerMemory(params.dbUserId);
  const supabase = tryCreateSupabaseAdminClient();

  let orderCount = 0;
  if (supabase) {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", params.dbUserId);
    if (typeof count === "number") orderCount = count;
  }

  const recent = memory?.recent_orders?.[0];
  const favorite_product_names: string[] = [];
  if (recent?.items_summary) {
    for (const part of recent.items_summary.split(",")) {
      const name = part.split("×")[0]?.trim();
      if (name && name !== "Unknown item") favorite_product_names.push(name);
    }
  }

  const budget_signal: UserProfileSnapshot["budget_signal"] =
    params.loyaltyTier === "vip" ? "high" : orderCount >= 3 ? "medium" : "unknown";

  const sales_hooks: string[] = [];
  if (favorite_product_names.length) {
    sales_hooks.push(`Repeat buyer — mention "${favorite_product_names[0]}" if relevant.`);
  }
  if (orderCount >= 2) {
    sales_hooks.push("Returning customer — acknowledge loyalty briefly.");
  }
  if (budget_signal === "high") {
    sales_hooks.push("Upsell premium / gift boxes when appropriate.");
  }

  return {
    display_name: params.displayName,
    preferred_categories: [],
    favorite_product_names: favorite_product_names.slice(0, 4),
    order_count: orderCount,
    last_order_hint: recent
      ? `${recent.order_code ?? "order"} · ${recent.status} · ${recent.items_summary}`
      : null,
    budget_signal,
    sales_hooks,
  };
}
