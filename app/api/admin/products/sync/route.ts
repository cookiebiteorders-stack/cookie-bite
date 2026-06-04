import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.sync_trigger",
    module: "products",
    request: req,
  });

  const supabase = createSupabaseAdminClient();
  const { data: slugRows } = await supabase
    .from("products")
    .select("slug")
    .eq("is_active", true);

  let revalidatedProductPages = 0;
  try {
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/shop", "layout");
    revalidatePath("/api/products");
    for (const row of slugRows ?? []) {
      const slug = typeof row.slug === "string" ? row.slug.trim() : "";
      if (!slug) continue;
      revalidatePath(`/shop/${slug}`);
      revalidatedProductPages += 1;
    }
  } catch (e) {
    console.error("revalidatePath after products sync", e);
  }

  return NextResponse.json({
    ok: true,
    revalidated_product_pages: revalidatedProductPages,
    message: {
      en: `Storefront cache revalidated (${revalidatedProductPages} product pages). CMS webhooks still apply for Sanity-driven content.`,
      ar: `تم تحديث كاش المتجر (${revalidatedProductPages} صفحة منتج). تحديثات Sanity/CMS ما زالت عبر الويبهوك.`,
    },
  });
}
