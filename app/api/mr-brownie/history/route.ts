import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth/supabase-auth";
import { z } from "zod";
import {
  isGuestSessionUuid,
  MR_BROWNIE_GUEST_SESSION_COOKIE,
} from "@/lib/mr-brownie/guest-session-constants";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

const appendSchema = z.object({
  messages: z
    .array(
      z.object({
        sender_role: z.enum(["user", "assistant"]),
        message_content: z.string().min(1).max(12_000),
      }),
    )
    .min(1)
    .max(10),
});

function parseLimit(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("limit");
  const n = raw == null ? 20 : Number(raw);
  if (!Number.isFinite(n)) return 20;
  return Math.min(50, Math.max(1, Math.floor(n)));
}

export async function GET(req: NextRequest) {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ messages: [] as const });
  }

  const limit = parseLimit(req);
  const { userId } = await auth();

  if (userId) {
    const { data, error } = await supabase
      .from("mr_brownie_chat_messages")
      .select("sender_role, message_content, created_at")
      .eq("supabase_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[mr-brownie/history] GET clerk", error);
      return NextResponse.json({ messages: [] as const });
    }
    const rows = (data ?? []).reverse();
    return NextResponse.json({ messages: rows });
  }

  const jar = await cookies();
  const guestId = jar.get(MR_BROWNIE_GUEST_SESSION_COOKIE)?.value;
  if (!isGuestSessionUuid(guestId)) {
    return NextResponse.json({ messages: [] as const });
  }

  const { data, error } = await supabase
    .from("mr_brownie_chat_messages")
    .select("sender_role, message_content, created_at")
    .eq("guest_session_id", guestId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[mr-brownie/history] GET guest", error);
    return NextResponse.json({ messages: [] as const });
  }
  const rows = (data ?? []).reverse();
  return NextResponse.json({ messages: rows });
}

export async function POST(req: NextRequest) {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: { en: "Database unavailable", ar: "قاعدة البيانات غير متاحة." } },
      { status: 503 },
    );
  }

  const parsed = appendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { en: "Invalid payload", ar: "بيانات غير صالحة." } },
      { status: 400 },
    );
  }

  const { userId } = await auth();
  const jar = await cookies();
  const guestCookie = jar.get(MR_BROWNIE_GUEST_SESSION_COOKIE)?.value;

  if (userId) {
    const rows = parsed.data.messages.map((m) => ({
      sender_role: m.sender_role,
      message_content: m.message_content,
      supabase_user_id: userId,
      guest_session_id: null,
    }));
    const { error } = await supabase.from("mr_brownie_chat_messages").insert(rows);
    if (error) {
      console.error("[mr-brownie/history] POST clerk", error);
      return NextResponse.json(
        { error: { en: "Could not save messages", ar: "تعذر حفظ الرسائل." } },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true as const });
  }

  if (!isGuestSessionUuid(guestCookie)) {
    return NextResponse.json(
      {
        error: {
          en: "Guest session cookie missing. Call POST /api/mr-brownie/guest-session first.",
          ar: "جلسة الضيف غير موجودة.",
        },
      },
      { status: 400 },
    );
  }

  const rows = parsed.data.messages.map((m) => ({
    sender_role: m.sender_role,
    message_content: m.message_content,
    clerk_user_id: null,
    guest_session_id: guestCookie,
  }));
  const { error } = await supabase.from("mr_brownie_chat_messages").insert(rows);
  if (error) {
    console.error("[mr-brownie/history] POST guest", error);
    return NextResponse.json(
      { error: { en: "Could not save messages", ar: "تعذر حفظ الرسائل." } },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true as const });
}
