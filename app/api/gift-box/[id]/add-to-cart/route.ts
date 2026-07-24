import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

type GiftBoxItemRow = { product_id: string; quantity: number; product_snapshot?: unknown };

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gift_boxes")
    .select("id, box_size, items, total_price, is_active")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      bilingualError("Gift box not found", "صندوق الهدية غير موجود"),
      { status: 404 },
    );
  }

  // Recompute price from current, active product prices — never trust the
  // stored `total_price` verbatim (it may be stale if prices changed since
  // this box was created/shared).
  const items = Array.isArray(data.items) ? (data.items as GiftBoxItemRow[]) : [];
  const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
  const { data: products } = productIds.length
    ? await supabase
        .from("products")
        .select("id, price_egp, is_active")
        .in("id", productIds)
    : { data: [] as { id: string; price_egp: number; is_active: boolean }[] };
  const priceMap = new Map((products ?? []).map((p) => [p.id, p]));

  let verifiedPrice = 0;
  let allAvailable = items.length > 0;
  for (const item of items) {
    const p = priceMap.get(item.product_id);
    if (!p || !p.is_active) {
      allAvailable = false;
      continue;
    }
    verifiedPrice += Number(p.price_egp) * Number(item.quantity ?? 0);
  }

  if (!allAvailable) {
    return NextResponse.json(
      bilingualError(
        "Some gift box items are no longer available",
        "بعض منتجات صندوق الهدايا لم تعد متوفرة",
      ),
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    cart_item: {
      type: "gift_box",
      gift_box_id: data.id,
      box_size: data.box_size,
      items: data.items,
      price: verifiedPrice,
    },
  });
}
