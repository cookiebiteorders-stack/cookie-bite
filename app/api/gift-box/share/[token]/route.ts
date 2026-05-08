import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gift_boxes")
    .select("id, share_token, box_size, items, gift_message, ribbon_color, has_wrapping, total_price, is_active, created_at")
    .eq("share_token", token)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      bilingualError("Gift box not found", "صندوق الهدية غير موجود"),
      { status: 404 },
    );
  }
  return NextResponse.json({ gift_box: data });
}
