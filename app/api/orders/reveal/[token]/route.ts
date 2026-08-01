import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getOrderByRevealToken,
  markRevealViewed,
  saveRevealReaction,
} from "@/lib/gift-box/reveal";
import { bilingualError } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit/redis-limiter";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  
  // Use Redis-backed rate limiter (falls back to in-memory if Redis not configured)
  const rateLimitResult = await checkRateLimit(`gift-reveal:${ip}`, 20, 60 * 1000);
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      bilingualError("Too many requests. Please try again later.", "طلبات كثيرة. يرجى المحاولة لاحقاً"),
      { status: 429 },
    );
  }

  const { token } = await ctx.params;
  const order = await getOrderByRevealToken(token);
  if (!order) {
    console.warn("[gift-reveal] Gift not found", { ip, token });
    return NextResponse.json(
      bilingualError("Gift not found", "الهدية غير متاحة"),
      { status: 404 },
    );
  }

  // Check if gift link has expired
  if (order.reveal_expires_at && new Date(order.reveal_expires_at) < new Date()) {
    console.warn("[gift-reveal] Gift link expired", { ip, token, expiresAt: order.reveal_expires_at });
    return NextResponse.json(
      bilingualError("Gift link expired", "انتهت صلاحية رابط الهدية"),
      { status: 410 },
    );
  }

  void markRevealViewed(order.id);

  console.info("[gift-reveal] Gift accessed successfully", { ip, orderId: order.id });

  return NextResponse.json({ order });
}

const reactionSchema = z.object({
  reaction: z.enum(["love", "wow", "yum", "thanks"]),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      bilingualError("Too many requests. Please try again later.", "طلبات كثيرة. يرجى المحاولة لاحقاً"),
      { status: 429 },
    );
  }

  const { token } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    console.warn("[gift-reveal] Invalid reaction attempt", { ip, token, body });
    return NextResponse.json(
      bilingualError("Invalid reaction", "تفاعل غير صالح"),
      { status: 400 },
    );
  }

  const ok = await saveRevealReaction(token, parsed.data.reaction);
  if (!ok) {
    console.warn("[gift-reveal] Could not save reaction", { ip, token, reaction: parsed.data.reaction });
    return NextResponse.json(
      bilingualError("Could not save reaction", "تعذر حفظ التفاعل"),
      { status: 400 },
    );
  }

  console.info("[gift-reveal] Reaction saved", { ip, token, reaction: parsed.data.reaction });

  return NextResponse.json({ ok: true, reaction: parsed.data.reaction });
}
