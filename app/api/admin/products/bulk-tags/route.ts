import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import { zodPayloadError } from "@/lib/validations/zod-errors";
import { bulkApplyProductTags } from "@/lib/db/product-tag-bulk";

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  tag_ids: z.array(z.string().uuid()).min(1).max(50),
  mode: z.enum(["add", "remove", "replace"]).default("add"),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(zodPayloadError(parsed.error), { status: 400 });
  }

  const { ids, tag_ids, mode } = parsed.data;
  const supabase = createSupabaseAdminClient();

  try {
    const affected = await bulkApplyProductTags(supabase, ids, tag_ids, mode);
    await writeAuditLog({
      actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
      action: "products.bulk_tags",
      module: "products",
      metadata: { ids, tag_ids, mode, affected },
      request: req,
    });
    return NextResponse.json({ ok: true, affected, mode });
  } catch {
    return NextResponse.json(
      bilingualError("Failed to apply tags", "فشل تطبيق الوسوم"),
      { status: 500 },
    );
  }
}
