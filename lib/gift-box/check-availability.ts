import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { GiftBoxOrderSnapshot } from "@/lib/gift-box/order-snapshot";

type GiftBoxAvailabilityResult = {
  unavailableItems: string[];
  canReorder: boolean;
  /**
   * Snapshot with every item price and the total recomputed from the current
   * `products.price_egp` — never trust `snapshot.totalPrice`/`items[].price`
   * as sent by the client. Only trustworthy when `canReorder` is true.
   */
  verifiedSnapshot: GiftBoxOrderSnapshot;
};

/**
 * يتحقق من توفر منتجات صندوق الهدايا **ويعيد حساب السعر من قاعدة البيانات** —
 * لا يجب الوثوق أبداً بـ `totalPrice`/`items[].price` القادمة من العميل.
 */
export async function checkGiftBoxSnapshotAvailability(
  snapshot: GiftBoxOrderSnapshot,
): Promise<GiftBoxAvailabilityResult> {
  const ids = [...new Set(snapshot.items.map((i) => i.productId))];
  if (!ids.length) {
    return { unavailableItems: [], canReorder: false, verifiedSnapshot: snapshot };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, title_en, stock, is_active, price_egp")
    .in("id", ids);

  if (error) {
    console.error("checkGiftBoxSnapshotAvailability", error);
    // Fail CLOSED: if pricing/availability can't be verified against the DB,
    // never let a checkout proceed with client-supplied prices.
    return { unavailableItems: [], canReorder: false, verifiedSnapshot: snapshot };
  }

  const byId = new Map(
    (data ?? []).map((p) => [
      p.id as string,
      p as {
        id: string;
        name: string;
        title_en: string | null;
        stock: number;
        is_active: boolean;
        price_egp: number;
      },
    ]),
  );

  const unavailableItems: string[] = [];
  let verifiedTotal = 0;
  const verifiedItems = snapshot.items.map((item) => {
    const row = byId.get(item.productId);
    const label = row ? row.title_en?.trim() || row.name : item.name;
    if (!row || !row.is_active || Number(row.stock) < item.quantity) {
      unavailableItems.push(label);
      return item;
    }
    const verifiedPrice = Number(row.price_egp);
    verifiedTotal += verifiedPrice * item.quantity;
    return {
      ...item,
      name: row.title_en?.trim() || row.name || item.name,
      price: verifiedPrice,
    };
  });

  const canReorder = unavailableItems.length === 0;

  return {
    unavailableItems,
    canReorder,
    verifiedSnapshot: canReorder
      ? { ...snapshot, items: verifiedItems, totalPrice: verifiedTotal }
      : snapshot,
  };
}
