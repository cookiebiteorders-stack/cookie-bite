import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { triggerEmailAutomationEvent } from "@/lib/email/automation/event-trigger";
import { verifyInternalSecret } from "@/lib/auth/verify-internal";

const bodySchema = z.object({
  event_name: z.string().min(2).max(120),
  to: z.string().email(),
  user_id: z.string().uuid().nullable().optional(),
  provided_data: z.record(z.string(), z.unknown()).default({}),
  user_data: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  // Fails CLOSED (constant-time compare) — unlike the previous check, a
  // missing INTERNAL_API_SECRET no longer grants unauthenticated access.
  if (!verifyInternalSecret(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const result = await triggerEmailAutomationEvent({
    eventName: parsed.data.event_name,
    to: parsed.data.to,
    userId: parsed.data.user_id ?? null,
    providedData: parsed.data.provided_data,
    userData: parsed.data.user_data,
  });
  return NextResponse.json({ ok: result.ok, result }, { status: result.ok ? 200 : 202 });
}
