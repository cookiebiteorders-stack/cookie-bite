import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

  try {
    revalidatePath("/shop");
    revalidatePath("/shop", "layout");
    revalidatePath("/api/products");
  } catch (e) {
    console.error("revalidatePath after products sync", e);
  }

  return NextResponse.json({
    ok: true,
    message: {
      en: "Storefront cache revalidated. Sanity/content webhooks still apply for CMS-driven updates.",
      ar: "تم تحديث الكاش للمتجر. ويبهوكس Sanity/المحتوى لا تزال تنطبق على تحديثات CMS.",
    },
  });
}
