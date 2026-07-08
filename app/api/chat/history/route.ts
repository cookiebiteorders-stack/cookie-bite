import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/supabase-auth";
import { isChatSessionUuid } from "@/lib/chat/session-id";
import { resolveDbUserId } from "@/lib/chat/resolve-user";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

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
    const dbUserId = await resolveDbUserId(supabase, userId);
    if (!dbUserId) {
      return NextResponse.json({ messages: [] as const });
    }
    const { data, error } = await supabase
      .from("chat_messages")
      .select("role, content, created_at, metadata")
      .eq("user_id", dbUserId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[api/chat/history] GET user", error);
      return NextResponse.json({ messages: [] as const });
    }
    return NextResponse.json({ messages: (data ?? []).reverse() });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId")?.trim() ?? "";
  if (!isChatSessionUuid(sessionId)) {
    return NextResponse.json({ messages: [] as const });
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content, created_at, metadata")
    .eq("session_id", sessionId)
    .is("user_id", null)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[api/chat/history] GET guest", error);
    return NextResponse.json({ messages: [] as const });
  }
  return NextResponse.json({ messages: (data ?? []).reverse() });
}
