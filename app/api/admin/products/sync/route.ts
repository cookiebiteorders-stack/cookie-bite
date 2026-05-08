import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.sync_trigger",
    module: "products",
    request: req,
  });

  // مزامنة Sanity الفعلية تُنفّذ عبر webhook تلقائي.
  // هذا endpoint يوفر نقطة trigger يدوية (noop آمنة حالياً).
  return NextResponse.json({
    ok: true,
    message: {
      en: "Manual sync trigger accepted. Use /api/sanity/webhook for actual sync payload.",
      ar: "تم قبول طلب المزامنة اليدوية. استخدم /api/sanity/webhook للمزامنة الفعلية.",
    },
  });
}
