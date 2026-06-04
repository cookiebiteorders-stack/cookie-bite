import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { drainEmailBullJobs } from "@/lib/email/automation/bull-queue";
import { drainEmailQueue } from "@/lib/email/automation/pipeline";
import { requeueFailedEmails } from "@/lib/email/automation/self-heal";
import { bilingualError } from "@/lib/validations";

export async function GET(req: NextRequest) {
  await requireAdminAccess("settings");
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50);
  const status = req.nextUrl.searchParams.get("status");

  try {
    const supabase = createSupabaseAdminClient();
    let q = supabase
      .from("email_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json(bilingualError(msg, msg), { status: 500 });
  }
}

/** POST — معالجة الطابور فوراً (نفس cron email-worker). */
export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);

  const limit = Math.min(50, Number(req.nextUrl.searchParams.get("limit") ?? 25) || 25);
  try {
    const [database, bull, requeued] = await Promise.all([
      drainEmailQueue(limit),
      drainEmailBullJobs(limit),
      requeueFailedEmails(Math.floor(limit / 2)),
    ]);
    return NextResponse.json({
      ok: true,
      processed: { database, bull, requeued },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "process_failed";
    return NextResponse.json(bilingualError(msg, msg), { status: 500 });
  }
}
