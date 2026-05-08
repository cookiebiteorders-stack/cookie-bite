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
  const { error } = await supabase
    .from("gift_boxes")
    .update({
      box_size: parsed.data.box_size,
      items: parsed.data.items,
      gift_message: parsed.data.gift_message ?? null,
      ribbon_color: parsed.data.ribbon_color,
      has_wrapping: parsed.data.has_wrapping,
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
