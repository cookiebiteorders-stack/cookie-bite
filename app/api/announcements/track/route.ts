import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { trackAnnouncementEvent } from "@/lib/announcements/server";
import type { TrackEventType } from "@/lib/announcements/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const VALID_EVENTS: TrackEventType[] = ["impression", "click", "dismiss", "conversion"];

export async function POST(request: Request) {
  let body: {
    announcementId?: string;
    eventType?: string;
    sessionId?: string;
    page?: string;
    variantKey?: string;
    metadata?: Record<string, unknown>;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { en: "Invalid JSON", ar: "JSON غير صالح" } },
      { status: 400 },
    );
  }

  const announcementId = body.announcementId;
  const eventType = body.eventType as TrackEventType | undefined;

  if (!announcementId || !eventType || !VALID_EVENTS.includes(eventType)) {
    return NextResponse.json(
      { error: { en: "Invalid announcement or event", ar: "إعلان أو حدث غير صالح" } },
      { status: 400 },
    );
  }

  let dbUserId: string | null = null;
  const { userId } = await auth();
  if (userId) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", userId)
        .maybeSingle();
      dbUserId = (data?.id as string | undefined) ?? null;
    } catch {
      dbUserId = null;
    }
  }

  await trackAnnouncementEvent({
    announcementId,
    eventType,
    userId: dbUserId,
    sessionId: body.sessionId ?? null,
    page: body.page ?? null,
    variantKey: body.variantKey ?? null,
    metadata: body.metadata,
  });

  return NextResponse.json({ ok: true });
}
