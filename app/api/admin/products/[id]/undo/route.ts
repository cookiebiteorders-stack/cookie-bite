import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import { zodPayloadError } from "@/lib/validations/zod-errors";
import type { AuditLogRow } from "@/lib/admin/audit-display";
import {
  restoreProductFromAuditBefore,
  saveProductVersions,
} from "@/lib/admin/product-versions";
import { revalidateStorefrontCatalog } from "@/lib/storefront/revalidate-catalog";
import { revalidatePath } from "next/cache";

const bodySchema = z.object({
  audit_log_id: z.string().uuid(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);
  const { id: productId } = await context.params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(zodPayloadError(parsed.error), { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: log, error: logErr } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("id", parsed.data.audit_log_id)
    .eq("module", "products")
    .maybeSingle();

  if (logErr || !log) {
    return NextResponse.json(bilingualError("Audit log not found", "السجل غير موجود"), { status: 404 });
  }

  const audit = log as AuditLogRow;
  const beforeRows = extractBeforeRows(audit, productId);
  if (beforeRows.length === 0) {
    return NextResponse.json(
      bilingualError("No restorable snapshot in this log", "لا توجد نسخة قابلة للاستعادة"),
      { status: 400 },
    );
  }

  const beforeRow = beforeRows[0]!;
  const { data: current } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
  if (!current) {
    return NextResponse.json(bilingualError("Product not found", "المنتج غير موجود"), { status: 404 });
  }

  try {
    await saveProductVersions(
      supabase,
      [current as Record<string, unknown>],
      { user_id: actor.user_id, email: actor.email, role: actor.role },
      "before_undo",
      parsed.data.audit_log_id,
    );

    const product = await restoreProductFromAuditBefore(
      supabase,
      productId,
      beforeRow,
    );

    await writeAuditLog({
      actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
      action: "products.undo",
      module: "products",
      entity_id: productId,
      metadata: { audit_log_id: parsed.data.audit_log_id, undone_action: audit.action },
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

    return NextResponse.json({ ok: true, product });
  } catch {
    return NextResponse.json(bilingualError("Undo failed", "فشل التراجع"), { status: 500 });
  }
}

function extractBeforeRows(log: AuditLogRow, productId: string): Record<string, unknown>[] {
  const before = log.before;
  if (!before) return [];

  if (Array.isArray(before)) {
    return before.filter(
      (row): row is Record<string, unknown> =>
        typeof row === "object" &&
        row !== null &&
        String((row as Record<string, unknown>).id) === productId,
    );
  }

  if (typeof before === "object" && before !== null) {
    const row = before as Record<string, unknown>;
    if (String(row.id) === productId) return [row];
  }

  return [];
}
