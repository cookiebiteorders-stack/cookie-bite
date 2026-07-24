import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { giftBoxSchema, bilingualError } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), {
      status: 401,
    });
  }
  const parsed = giftBoxSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const supabase = createSupabaseAdminClient();

  // Recompute the total from current, active product prices — never trust a
  // stale/client-supplied total when the item list changes.
  const productIds = parsed.data.items.map((i) => i.product_id);
  const { data: products } = await supabase
    .from("products")
    .select("id, name, title_en, title_ar, price_egp, image_url")
    .in("id", productIds)
    .eq("is_active", true);
  const productMap = new Map((products ?? []).map((p) => [p.id, p]));
  let total = 0;
  const items = parsed.data.items.map((i) => {
    const p = productMap.get(i.product_id);
    const unit = Number(p?.price_egp ?? 0);
    total += unit * i.quantity;
    return {
      product_id: i.product_id,
      quantity: i.quantity,
      product_snapshot: p ?? null,
    };
  });

  const { error } = await supabase
    .from("gift_boxes")
    .update({
      box_size: parsed.data.box_size,
      items,
      gift_message: parsed.data.gift_message ?? null,
      ribbon_color: parsed.data.ribbon_color,
      has_wrapping: parsed.data.has_wrapping,
      total_price: total,
    })
    .eq("id", id)
    .eq("user_id", profile.id);

  if (error) {
    return NextResponse.json(
      bilingualError("Failed to update gift box", "فشل تحديث صندوق الهدية"),
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
