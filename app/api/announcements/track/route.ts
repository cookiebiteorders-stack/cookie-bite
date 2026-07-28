import { auth } from "@/lib/auth/supabase-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { trackAnnouncementEvent } from "@/lib/announcements/server";
import type { TrackEventType } from "@/lib/announcements/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const VALID_EVENTS: TrackEventType[] = ["impression", "click", "dismiss", "conversion"];

const bodySchema = z.object({
  announcementId: z.string().min(1).max(120),
  eventType: z.enum(["impression", "click", "dismiss", "conversion"]),
  sessionId: z.string().max(120).optional(),
  page: z.string().max(300).optional(),
  variantKey: z.string().max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const MAX_METADATA_BYTES = 4 * 1024;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: { en: "Invalid JSON", ar: "JSON غير صالح" } },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || !VALID_EVENTS.includes(parsed.data.eventType)) {
    return NextResponse.json(
      { error: { en: "Invalid announcement or event", ar: "إعلان أو حدث غير صالح" } },
      { status: 400 },
    );
  }

  const body = parsed.data;
  if (body.metadata && JSON.stringify(body.metadata).length > MAX_METADATA_BYTES) {
    return NextResponse.json(
      { error: { en: "Metadata too large", ar: "بيانات إضافية كبيرة جداً" } },
      { status: 413 },
    );
  }

  let dbUserId: string | null = null;
  const { userId } = await auth();
  if (userId) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      dbUserId = (data?.id as string | undefined) ?? null;
    } catch {
      dbUserId = null;
    }
  }

  await trackAnnouncementEvent({
    announcementId: body.announcementId,
    eventType: body.eventType,
    userId: dbUserId,
    sessionId: body.sessionId ?? null,
    page: body.page ?? null,
    variantKey: body.variantKey ?? null,
    metadata: body.metadata,
  });

  return NextResponse.json({ ok: true });
}
