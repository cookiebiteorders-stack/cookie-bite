import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { isChatSessionUuid } from "@/lib/chat/session-id";
import { resolveDbUserId } from "@/lib/chat/resolve-user";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  sessionId: z.string().min(36).max(64).optional(),
});

/** Soft-delete: is_deleted = true (امتثال طلبات حذف البيانات دون فقدان السجل للتدقيق) */
export async function POST(req: NextRequest) {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: { en: "Database unavailable", ar: "قاعدة البيانات غير متاحة." } },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { en: "Invalid payload", ar: "بيانات غير صالحة." } },
      { status: 400 },
    );
  }

  const { userId: clerkUserId } = await auth();

  if (clerkUserId) {
    const dbUserId = await resolveDbUserId(supabase, clerkUserId);
    if (!dbUserId) {
      return NextResponse.json({ ok: true as const });
    }
    const { error } = await supabase
      .from("chat_messages")
      .update({ is_deleted: true })
      .eq("user_id", dbUserId)
      .eq("is_deleted", false);
    if (error) {
      console.error("[api/chat/clear] user", error);
      return NextResponse.json(
        { error: { en: "Clear failed", ar: "تعذر مسح المحادثة." } },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true as const });
  }

  const sid = parsed.data.sessionId?.trim();
  if (!isChatSessionUuid(sid)) {
    return NextResponse.json(
      { error: { en: "sessionId required for guest", ar: "مطلوب معرّف الجلسة." } },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("chat_messages")
    .update({ is_deleted: true })
    .eq("session_id", sid)
    .is("user_id", null)
    .eq("is_deleted", false);

  if (error) {
    console.error("[api/chat/clear] guest", error);
    return NextResponse.json(
      { error: { en: "Clear failed", ar: "تعذر مسح المحادثة." } },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true as const });
}
