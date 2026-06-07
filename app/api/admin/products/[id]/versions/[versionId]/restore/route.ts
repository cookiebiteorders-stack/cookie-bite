import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import {
  restoreProductVersion,
  saveProductVersions,
} from "@/lib/admin/product-versions";
import { revalidateStorefrontCatalog } from "@/lib/storefront/revalidate-catalog";
import { revalidatePath } from "next/cache";

type RouteContext = { params: Promise<{ id: string; versionId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);
  const { id: productId, versionId } = await context.params;

  const supabase = createSupabaseAdminClient();
  const { data: current } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
  if (!current) {
    return NextResponse.json(bilingualError("Product not found", "المنتج غير موجود"), { status: 404 });
  }

  try {
    await saveProductVersions(
      supabase,
      [current as Record<string, unknown>],
      { user_id: actor.user_id, email: actor.email, role: actor.role },
      "before_restore",
    );

    const { product, version } = await restoreProductVersion(supabase, productId, versionId);

    await writeAuditLog({
      actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
      action: "products.version_restore",
      module: "products",
      entity_id: productId,
      metadata: {
        version_id: versionId,
        version_number: version.version_number,
        product_id: productId,
      },
      before: current,
      after: product,
      request: req,
    });

    try {
      await revalidateStorefrontCatalog();
      revalidatePath("/");
      revalidatePath("/shop");
      if (typeof product.slug === "string" && product.slug) {
        revalidatePath(`/shop/${product.slug}`);
      }
      revalidatePath("/api/products");
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({ ok: true, product, restored_version: version.version_number });
  } catch {
    return NextResponse.json(
      bilingualError("Failed to restore version", "فشل استعادة النسخة"),
      { status: 500 },
    );
  }
}
