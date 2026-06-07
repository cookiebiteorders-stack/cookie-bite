import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import { deriveSeverity, type AuditLogRow } from "@/lib/admin/audit-display";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  await requireAdminAccess("products");
  const { id } = await context.params;
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  const limit = parsed.success ? parsed.data.limit : 30;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("module", "products")
    .or(`entity_id.eq.${id},metadata->>product_id.eq.${id}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      bilingualError("Failed to load history", "فشل تحميل السجل"),
      { status: 500 },
    );
  }

  const logs = (data ?? []) as AuditLogRow[];
  const enriched = logs.map((log) => ({
    ...log,
    severity: deriveSeverity(log),
    summary: summarizeProductAudit(log, id),
    can_undo: hasRestorableBefore(log, id),
  }));

  return NextResponse.json({ logs: enriched, product_id: id });
}

function summarizeProductAudit(log: AuditLogRow, productId: string): string {
  const action = log.action ?? "";
  if (action.includes("create")) return "إنشاء المنتج";
  if (action.includes("delete")) return "حذف المنتج";
  if (action.includes("variants")) return "تحديث المتغيرات (Variants)";
  if (action.includes("bulk")) return "تحديث جماعي";
  if (action.includes("import")) return "استيراد";
  if (action.includes("batch")) return "حفظ تعديلات الجدول";
  if (action.includes("update") || action.includes("bulk_update")) {
    const meta = log.metadata as Record<string, unknown> | null;
    const patch = meta?.patch as Record<string, unknown> | undefined;
    if (patch && Object.keys(patch).length > 0) {
      return `تعديل: ${Object.keys(patch).slice(0, 4).join(", ")}`;
    }
    return "تحديث المنتج";
  }
  return action || `سجل #${productId.slice(0, 8)}`;
}

function hasRestorableBefore(log: AuditLogRow, productId: string): boolean {
  const action = log.action ?? "";
  if (action.includes("delete") || action.includes("create") || action.includes("undo")) return false;
  const before = log.before;
  if (!before) return false;
  if (Array.isArray(before)) {
    return before.some(
      (row) =>
        typeof row === "object" &&
        row !== null &&
        String((row as Record<string, unknown>).id) === productId,
    );
  }
  if (typeof before === "object" && before !== null) {
    return String((before as Record<string, unknown>).id) === productId;
  }
  return false;
}
