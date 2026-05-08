import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

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
  return NextResponse.json({
    ok: true,
    cart_item: {
      type: "gift_box",
      gift_box_id: data.id,
      box_size: data.box_size,
      items: data.items,
      price: data.total_price,
    },
  });
}
