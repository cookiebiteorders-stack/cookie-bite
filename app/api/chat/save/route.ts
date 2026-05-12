import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { isChatSessionUuid } from "@/lib/chat/session-id";
import { resolveDbUserId } from "@/lib/chat/resolve-user";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

const saveSchema = z.object({
  sessionId: z.string().min(36).max(64),
  message: z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(12_000),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

export async function POST(req: NextRequest) {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: { en: "Database unavailable", ar: "قاعدة البيانات غير متاحة." } },
      { status: 503 },
    );
  }

  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isChatSessionUuid(parsed.data.sessionId)) {
    return NextResponse.json(
      { error: { en: "Invalid payload", ar: "بيانات غير صالحة." } },
      { status: 400 },
    );
  }

  const { sessionId, message } = parsed.data;
  const { userId: clerkUserId } = await auth();

  if (clerkUserId) {
    const dbUserId = await resolveDbUserId(supabase, clerkUserId);
    const { error } = await supabase.from("chat_messages").insert({
      user_id: dbUserId,
      session_id: sessionId,
      role: message.role,
      content: message.content,
      metadata: message.metadata ?? null,
      is_deleted: false,
    });
    if (error) {
      console.error("[api/chat/save] user", error);
      return NextResponse.json(
        { error: { en: "Could not save message", ar: "تعذر حفظ الرسالة." } },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true as const });
  }

  const { error } = await supabase.from("chat_messages").insert({
    user_id: null,
    session_id: sessionId,
    role: message.role,
    content: message.content,
    metadata: message.metadata ?? null,
    is_deleted: false,
  });
  if (error) {
    console.error("[api/chat/save] guest", error);
    return NextResponse.json(
      { error: { en: "Could not save message", ar: "تعذر حفظ الرسالة." } },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true as const });
}
