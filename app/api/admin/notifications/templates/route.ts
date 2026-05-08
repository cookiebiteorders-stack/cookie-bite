import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";

const schema = z.object({
  channel: z.enum(["email", "sms", "whatsapp", "push"]),
  key: z.string().min(2).max(120),
  language: z.enum(["en", "ar"]).default("en"),
  subject: z.string().max(200).optional(),
  body: z.string().min(2),
  is_active: z.boolean().default(true),
});

export async function GET() {
  await requireAdminAccess("settings");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notification_templates")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const payload = parsed.data;
  const { data, error } = await supabase
    .from("notification_templates")
    .upsert(payload, { onConflict: "channel,key,language" })
    .select("*")
    .single();
  if (error || !data) {
    return NextResponse.json(
      bilingualError("Failed to upsert template", "فشل حفظ القالب"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "notifications.template_upsert",
    module: "settings",
    entity_id: data.id,
    after: data,
    request: req,
  });

  return NextResponse.json({ ok: true, template: data });
}

