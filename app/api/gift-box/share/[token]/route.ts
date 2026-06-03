import { NextRequest, NextResponse } from "next/server";
import { getGiftBoxByShareToken } from "@/lib/gift-box/share";
import { bilingualError } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const data = await getGiftBoxByShareToken(token);
  if (!data) {
    return NextResponse.json(
      bilingualError("Gift box not found", "صندوق الهدية غير موجود"),
      { status: 404 },
    );
  }
  return NextResponse.json({ gift_box: data });
}
