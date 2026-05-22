import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

export async function GET(req: NextRequest) {
  await requireAdminAccess("settings");
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50);
  const status = req.nextUrl.searchParams.get("status");

  try {
    const supabase = createSupabaseAdminClient();
    let q = supabase
      .from("email_logs")
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
