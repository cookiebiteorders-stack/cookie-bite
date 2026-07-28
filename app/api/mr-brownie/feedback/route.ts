import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/supabase-auth";
import { cookies } from "next/headers";
import { z } from "zod";
import { isChatSessionUuid } from "@/lib/chat/session-id";
import {
  isGuestSessionUuid,
  MR_BROWNIE_GUEST_SESSION_COOKIE,
} from "@/lib/mr-brownie/guest-session-constants";
import { storeMrBrownieFeedback } from "@/lib/mr-brownie/training/feedback-store";

const bodySchema = z.object({
  rating: z.union([z.literal(1), z.literal(-1)]),
  userMessage: z.string().min(1).max(12000),
  assistantMessage: z.string().min(1).max(12000),
  comment: z.string().max(500).optional(),
  sessionId: z.string().max(64).optional(),
  pathname: z.string().max(500).optional(),
  locale: z.enum(["ar", "en", "auto"]).optional(),
  activePersona: z.enum(["mr_brownie", "mrs_cookie"]).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { en: "Invalid payload", ar: "بيانات غير صالحة" } },
      { status: 400 },
    );
  }

  const { userId } = await auth();
  const jar = await cookies();
  const guestRaw = jar.get(MR_BROWNIE_GUEST_SESSION_COOKIE)?.value;
  const guestSessionId = isGuestSessionUuid(guestRaw) ? guestRaw : null;

  const sessionId = parsed.data.sessionId;
  if (sessionId && !isChatSessionUuid(sessionId)) {
    return NextResponse.json(
      { error: { en: "Invalid session", ar: "جلسة غير صالحة" } },
      { status: 400 },
    );
  }

  const result = await storeMrBrownieFeedback({
    rating: parsed.data.rating,
    userMessage: parsed.data.userMessage,
    assistantMessage: parsed.data.assistantMessage,
    comment: parsed.data.comment,
    sessionId,
    pathname: parsed.data.pathname,
    locale: parsed.data.locale,
    supabaseUserId: userId,
    guestSessionId,
    activePersona: parsed.data.activePersona,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: {
          en: result.error,
          ar: "تعذر حفظ التقييم.",
        },
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true as const, id: result.id });
}
