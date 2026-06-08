import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BehaviorFlag } from "@/lib/announcements/behavior";

export async function resolveServerBehaviors(
  dbUserId: string | null,
  clientBehaviors: string[] = [],
): Promise<BehaviorFlag[]> {
  const set = new Set<BehaviorFlag>(
    clientBehaviors.filter((b): b is BehaviorFlag =>
      ["viewed_product", "add_to_cart", "abandoned_cart", "purchased", "logged_in"].includes(b),
    ),
  );

  if (!dbUserId) return [...set];

  try {
    const supabase = createSupabaseAdminClient();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: abandoned }, { data: views }, { data: purchases }] = await Promise.all([
      supabase
        .from("abandoned_carts")
        .select("id")
        .eq("user_id", dbUserId)
        .eq("is_recovered", false)
        .gte("updated_at", since)
        .limit(1),
      supabase
        .from("user_events")
        .select("id")
        .eq("user_id", dbUserId)
        .eq("event_type", "view")
        .gte("created_at", since)
        .limit(1),
      supabase
        .from("user_events")
        .select("id")
        .eq("user_id", dbUserId)
        .eq("event_type", "purchase")
        .gte("created_at", since)
        .limit(1),
    ]);

    if (abandoned?.length) set.add("abandoned_cart");
    if (views?.length) set.add("viewed_product");
    if (purchases?.length) set.add("purchased");
  } catch {
    /* non-blocking */
  }

  return [...set];
}
