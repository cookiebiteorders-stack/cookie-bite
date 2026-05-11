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

function isMissingTemplatesTable(err: {
  code?: string;
  message?: string;
}): boolean {
  const m = (err.message ?? "").toLowerCase();
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    (m.includes("notification_templates") &&
      (m.includes("does not exist") ||
        m.includes("could not find") ||
        m.includes("schema cache")))
  );
}

export async function GET() {
  await requireAdminAccess("settings");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notification_templates")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    if (isMissingTemplatesTable(error)) {
      return NextResponse.json({
        templates: [],
        warning: {
          en: "notification_templates table is missing. Run latest migrations.",
          ar: "جدول notification_templates غير موجود. شغّل أحدث migrations.",
        },
      });
    }
    console.error("[api/admin/notifications/templates GET] Supabase:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    const body: Record<string, unknown> = {
      ...bilingualError("Database error", "خطأ في قاعدة البيانات"),
    };
    if (process.env.NODE_ENV === "development") {
      body.debug = {
        message: error.message,
        code: error.code,
        hint: error.hint,
      };
    }
    return NextResponse.json(body, { status: 500 });
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
    if (error?.code === "42P01") {
      return NextResponse.json(
        bilingualError(
          "notification_templates table is missing. Run latest migrations first.",
          "جدول notification_templates غير موجود. شغّل أحدث migrations أولاً.",
        ),
        { status: 500 },
      );
    }
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

