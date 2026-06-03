import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getOrderByRevealToken,
  markRevealViewed,
  saveRevealReaction,
} from "@/lib/gift-box/reveal";
import { bilingualError } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const order = await getOrderByRevealToken(token);
  if (!order) {
    return NextResponse.json(
      bilingualError("Gift not found", "الهدية غير متاحة"),
      { status: 404 },
    );
  }

  void markRevealViewed(order.id);

  return NextResponse.json({ order });
}

const reactionSchema = z.object({
  reaction: z.enum(["love", "wow", "yum", "thanks"]),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid reaction", "تفاعل غير صالح"),
      { status: 400 },
    );
  }

  const ok = await saveRevealReaction(token, parsed.data.reaction);
  if (!ok) {
    return NextResponse.json(
      bilingualError("Could not save reaction", "تعذر حفظ التفاعل"),
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, reaction: parsed.data.reaction });
}
