import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";

const rowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(160).optional(),
  sku: z.string().max(80).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  price_egp: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(200),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  let updated = 0;
  const failures: string[] = [];

  for (const row of parsed.data.rows) {
    const { id, ...patch } = row;
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length === 0) continue;

    const { error } = await supabase.from("products").update(clean).eq("id", id);
    if (error) failures.push(`${id}: ${error.message}`);
    else updated += 1;
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.import_rows",
    module: "products",
    metadata: { updated, attempted: parsed.data.rows.length, failures },
    request: req,
  });

  return NextResponse.json({
    ok: failures.length === 0,
    updated,
    failures,
  });
}
