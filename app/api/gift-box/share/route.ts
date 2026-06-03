import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createGiftBoxShare } from "@/lib/gift-box/share";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

const giftBoxShareBodySchema = z.object({
  box_size: z.string().min(1).max(40),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1),
  gift_message: z.string().max(500).optional().nullable(),
  ribbon_color: z.string().max(40).optional(),
  has_wrapping: z.boolean().optional(),
  total_price: z.number().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = giftBoxShareBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid share payload", "بيانات المشاركة غير صالحة"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const productIds = parsed.data.items.map((i) => i.product_id);
  const { data: products } = await supabase
    .from("products")
    .select("id, name, title_en, title_ar, price_egp, image_url")
    .in("id", productIds)
    .eq("is_active", true);

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));
  let computedTotal = 0;
  const items = parsed.data.items.map((i) => {
    const p = productMap.get(i.product_id);
    const unit = Number(p?.price_egp ?? 0);
    computedTotal += unit * i.quantity;
    return {
      product_id: i.product_id,
      quantity: i.quantity,
      product_snapshot: p ?? null,
    };
  });

  const total =
    parsed.data.total_price != null && parsed.data.total_price > 0
      ? parsed.data.total_price
      : computedTotal;

  const created = await createGiftBoxShare({
    box_size: parsed.data.box_size,
    items,
    gift_message: parsed.data.gift_message ?? null,
    ribbon_color: parsed.data.ribbon_color,
    has_wrapping: parsed.data.has_wrapping,
    total_price: total,
  });

  if (!created) {
    return NextResponse.json(
      bilingualError("Failed to create share link", "فشل إنشاء رابط المشاركة"),
      { status: 500 },
    );
  }

  return NextResponse.json({
    share_token: created.share_token,
    share_url: created.share_url,
    id: created.id,
  });
}
