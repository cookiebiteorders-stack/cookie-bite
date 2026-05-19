import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import { WHATSAPP_TEMPLATE_CATALOG } from "@/lib/notifications/whatsapp-template-catalog";

const schema = z.object({
  channel: z.enum(["whatsapp"]).default("whatsapp"),
  languages: z.array(z.enum(["en", "ar"])).default(["ar", "en"]),
  keys: z.array(z.string().min(2)).optional(),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const { languages, keys } = parsed.data;
  const defs = keys?.length
    ? WHATSAPP_TEMPLATE_CATALOG.filter((d) => keys.includes(d.key))
    : WHATSAPP_TEMPLATE_CATALOG;

  if (defs.length === 0) {
    return NextResponse.json(
      bilingualError("No matching templates", "لا توجد قوالب مطابقة"),
      { status: 400 },
    );
  }

  const rows = defs.flatMap((def) =>
    languages.map((language) => ({
      channel: "whatsapp" as const,
      key: def.key,
      language,
      subject: null,
      body: language === "ar" ? def.defaultBodyAr : def.defaultBodyEn,
      is_active: true,
    })),
  );

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notification_templates")
    .upsert(rows, { onConflict: "channel,key,language" })
    .select("id, key, language");

  if (error) {
    return NextResponse.json(
      bilingualError("Failed to seed templates", "فشل استيراد القوالب"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "notifications.template_seed",
    module: "settings",
    after: { count: data?.length ?? rows.length, keys: defs.map((d) => d.key) },
    request: req,
  });

  return NextResponse.json({
    ok: true,
    seeded: data?.length ?? rows.length,
    templates: data ?? [],
  });
}
