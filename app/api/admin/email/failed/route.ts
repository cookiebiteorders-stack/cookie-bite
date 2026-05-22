import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { retryFailedEmailById } from "@/lib/email/automation/self-heal";
import { bilingualError } from "@/lib/validations";

export async function GET(req: NextRequest) {
  await requireAdminAccess("settings");
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50);
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("failed_emails")
      .select("*")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json(bilingualError(msg, msg), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return NextResponse.json(bilingualError("Missing id", "المعرّف مطلوب"), { status: 400 });
  }
  const ok = await retryFailedEmailById(body.id);
  return NextResponse.json({ ok, retried: ok });
}
