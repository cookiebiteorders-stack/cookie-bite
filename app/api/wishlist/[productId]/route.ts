import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { bilingualError } from "@/lib/validations";

const paramsSchema = z.object({ productId: z.string().uuid() });

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ productId: string }> },
) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), {
      status: 401,
    });
  }
  const parsedParams = paramsSchema.safeParse(await ctx.params);
  if (!parsedParams.success) {
    return NextResponse.json(bilingualError("Invalid product id", "معرّف المنتج غير صالح"), {
      status: 400,
    });
  }
  const { productId } = parsedParams.data;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", profile.id)
    .eq("product_id", productId);
  if (error) {
    return NextResponse.json(
      bilingualError("Failed to remove item", "فشل حذف العنصر"),
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
