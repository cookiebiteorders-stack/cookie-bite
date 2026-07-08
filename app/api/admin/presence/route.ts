import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { readOnlineAdminStaff, upsertAdminPresence } from "@/lib/admin/presence";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

const heartbeatSchema = z.object({
  path: z.string().min(1).max(500),
  last_action: z.string().max(200).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("dashboard");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      bilingualError("Invalid JSON body", "جسم الطلب غير صالح"),
      { status: 400 },
    );
  }

  const parsed = heartbeatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid presence payload", "بيانات الحضور غير صالحة"),
      { status: 400 },
    );
  }

  let fullName: string | null = null;
  const targetUserId = actor.user_id || actor.supabase_user_id;
  if (targetUserId) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", targetUserId)
        .maybeSingle();
      fullName = (data?.full_name as string | null) ?? null;
    } catch {
      // best-effort
    }
  }

  await upsertAdminPresence(
    {
      clerk_user_id: actor.clerk_user_id,
      user_id: actor.user_id,
      email: actor.email,
      full_name: fullName,
      role: actor.role,
      current_path: parsed.data.path,
      last_action: parsed.data.last_action ?? null,
    },
    req,
  );

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  await requireAdminAccess("analytics");

  const windowSeconds = Math.min(
    1800,
    Math.max(30, Number(req.nextUrl.searchParams.get("window") ?? 300)),
  );

  const data = await readOnlineAdminStaff(windowSeconds);

  return NextResponse.json({
    ok: true,
    window_seconds: windowSeconds,
    online_count: data.count,
    staff: data.staff,
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
