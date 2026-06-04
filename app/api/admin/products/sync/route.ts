import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { backfillMissingProductSlugs } from "@/lib/products/backfill-slugs";

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
  const slugBackfill = await backfillMissingProductSlugs(supabase);

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
    slugs_backfilled: slugBackfill.updated,
    slug_backfill_errors: slugBackfill.errors,
    revalidated_product_pages: revalidatedProductPages,
    message: {
      en: `Storefront synced: ${slugBackfill.updated} slug(s) backfilled, ${revalidatedProductPages} PDP cache paths refreshed.`,
      ar: `تم مزامنة المتجر: ${slugBackfill.updated} رابط منتج، وتحديث ${revalidatedProductPages} صفحة تفاصيل.`,
    },
  });
}
