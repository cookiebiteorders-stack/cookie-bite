import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import { writeAuditLog } from "@/lib/admin/audit";

const schema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  url: z.string().min(1).max(300).optional(),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("analytics");
  requireWritePermission(actor);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("id,user_id,platform", { count: "exact" });

  const audience = subs?.length ?? 0;

  if (subsError) {
    return NextResponse.json(
      bilingualError("Failed to load subscriptions", "تعذّر تحميل الاشتراكات"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "push.broadcast",
    module: "notifications",
    metadata: {
      audience,
      payload: parsed.data,
    },
    request: req,
  });

  return NextResponse.json({
    ok: true,
    audience,
    payload: parsed.data,
    message: {
      en: "Broadcast logged. Server-side Web Push delivery requires VAPID keys and worker integration (subscriptions not returned for security).",
      ar: "تم تسجيل الإذاعة. إرسال Web Push من الخادم يتطلب مفاتيح VAPID وربط workers (لم تُعاد معلومات الاشتراك لأسباب أمنية).",
    },
  });
}
