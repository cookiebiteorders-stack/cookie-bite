import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { GiftBoxOrderSnapshot } from "@/lib/gift-box/order-snapshot";

export async function checkGiftBoxSnapshotAvailability(snapshot: GiftBoxOrderSnapshot) {
  const ids = [...new Set(snapshot.items.map((i) => i.productId))];
  if (!ids.length) {
    return { unavailableItems: [] as string[], canReorder: false };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, title_en, stock, is_active")
    .in("id", ids);

  if (error) {
    console.error("checkGiftBoxSnapshotAvailability", error);
    return { unavailableItems: [] as string[], canReorder: true };
  }

  const byId = new Map(
    (data ?? []).map((p) => [
      p.id as string,
      p as { id: string; name: string; title_en: string | null; stock: number; is_active: boolean },
    ]),
  );

  const unavailableItems: string[] = [];
  for (const item of snapshot.items) {
    const row = byId.get(item.productId);
    const label = row ? row.title_en?.trim() || row.name : item.name;
    if (!row || !row.is_active || Number(row.stock) < item.quantity) {
      unavailableItems.push(label);
    }
  }

  return {
    unavailableItems,
    canReorder: unavailableItems.length === 0,
  };
}
