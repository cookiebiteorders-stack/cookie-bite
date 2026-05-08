import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { giftBoxSchema, bilingualError } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = giftBoxSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid gift box payload", "بيانات صندوق الهدية غير صالحة"),
      { status: 400 },
    );
  }

  const profile = await getCurrentProfile();
  const supabase = createSupabaseAdminClient();

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

  const { data, error } = await supabase
    .from("gift_boxes")
    .insert({
      user_id: profile?.id ?? null,
      box_size: parsed.data.box_size,
      items,
      gift_message: parsed.data.gift_message ?? null,
      ribbon_color: parsed.data.ribbon_color,
      has_wrapping: parsed.data.has_wrapping,
      total_price: total,
    })
    .select("id, share_token, box_size, items, total_price, is_active, created_at")
    .single();
  if (error || !data) {
    return NextResponse.json(
      bilingualError("Failed to create gift box", "فشل إنشاء صندوق الهدية"),
      { status: 500 },
    );
  }
  return NextResponse.json({ gift_box: data });
}
