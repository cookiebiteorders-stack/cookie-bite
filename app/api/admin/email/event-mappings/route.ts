import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const mappingSchema = z.object({
  id: z.string().uuid().optional(),
  event_name: z.string().min(2).max(120),
  template_key: z.string().min(2).max(120),
  is_active: z.boolean().default(true),
});

export async function GET() {
  await requireAdminAccess("settings");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_event_template_mappings")
    .select("id,event_name,template_key,is_active,updated_at")
    .order("event_name", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, mappings: data ?? [] });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);
  const parsed = mappingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_event_template_mappings")
    .upsert(parsed.data, { onConflict: "event_name" })
    .select("id,event_name,template_key,is_active,updated_at")
    .single();
  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message ?? "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, mapping: data });
}
