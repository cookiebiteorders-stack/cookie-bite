import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { saveProductVersions } from "@/lib/admin/product-versions";
import { zodPayloadError } from "@/lib/validations/zod-errors";
import { revalidateStorefrontCatalog } from "@/lib/storefront/revalidate-catalog";

const rowPatchSchema = z.object({
  id: z.string().uuid(),
  patch: z
    .object({
      sku: z.string().max(80).nullable().optional(),
      category: z.string().max(100).nullable().optional(),
      price_egp: z.number().positive().optional(),
      stock: z.number().int().min(0).optional(),
      is_active: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: "patch is required" }),
});

const bodySchema = z.object({
  updates: z.array(rowPatchSchema).min(1).max(500),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(zodPayloadError(parsed.error), { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const ids = parsed.data.updates.map((u) => u.id);
  const { data: before } = await supabase.from("products").select("*").in("id", ids);
  if (before?.length) {
    await saveProductVersions(
      supabase,
      before as Record<string, unknown>[],
      { user_id: actor.user_id, email: actor.email, role: actor.role },
      "before_batch_update",
    ).catch(() => {
      /* non-fatal */
    });
  }

  let updatedCount = 0;
  const failures: string[] = [];
  const updatedRows: Record<string, unknown>[] = [];

  for (const { id, patch } of parsed.data.updates) {
    const { data, error } = await supabase.from("products").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) {
      failures.push(`${id}: ${error.message}`);
      continue;
    }
    if (data) {
      updatedCount += 1;
      updatedRows.push(data as Record<string, unknown>);
    }
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.batch_update",
    module: "products",
    metadata: { updated_count: updatedCount, failures, ids },
    before: before ?? null,
    after: updatedRows,
    request: req,
  });

  try {
    await revalidateStorefrontCatalog();
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/api/products");
    for (const row of updatedRows) {
      const slug = row.slug;
      if (typeof slug === "string" && slug) revalidatePath(`/shop/${slug}`);
    }
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({
    ok: failures.length === 0,
    updated: updatedCount,
    failures,
  });
}
