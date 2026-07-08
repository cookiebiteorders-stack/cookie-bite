import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/supabase-auth";
import { z } from "zod";
import { isChatSessionUuid } from "@/lib/chat/session-id";
import { resolveDbUserId } from "@/lib/chat/resolve-user";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  guestSessionId: z.string().min(36).max(64),
});

/** يربط رسائل الضيف (session_id) بحساب المستخدم بعد تسجيل الدخول */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { en: "Unauthorized", ar: "يجب تسجيل الدخول." } },
      { status: 401 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isChatSessionUuid(parsed.data.guestSessionId)) {
    return NextResponse.json(
      { error: { en: "Invalid guestSessionId", ar: "معرّف الجلسة غير صالح." } },
      { status: 400 },
    );
  }

  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: { en: "Database unavailable", ar: "قاعدة البيانات غير متاحة." } },
      { status: 503 },
    );
  }

  const dbUserId = await resolveDbUserId(supabase, userId);
  if (!dbUserId) {
    return NextResponse.json(
      { error: { en: "User profile not found", ar: "لم يُعثر على ملف المستخدم." } },
      { status: 404 },
    );
  }

  const guestSessionId = parsed.data.guestSessionId;
  const { error } = await supabase
    .from("chat_messages")
    .update({ user_id: dbUserId })
    .eq("session_id", guestSessionId)
    .is("user_id", null)
    .eq("is_deleted", false);

  if (error) {
    console.error("[api/chat/handover]", error);
    return NextResponse.json(
      { error: { en: "Handover failed", ar: "تعذر ربط المحادثة بالحساب." } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true as const });
}
