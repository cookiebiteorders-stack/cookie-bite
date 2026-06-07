import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import { insertProductWithSlugRetry } from "@/lib/products/insert-product";

const rowSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(2).max(160).optional(),
    sku: z.string().max(80).nullable().optional(),
    category: z.string().max(100).nullable().optional(),
    price_egp: z.number().positive().optional(),
    stock: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
    slug: z.string().min(2).max(180).optional(),
    title_en: z.string().max(160).optional().nullable(),
  })
  .refine(
    (row) =>
      Boolean(row.id) ||
      (Boolean(row.name && row.name.length >= 2) &&
        row.price_egp != null &&
        Number(row.price_egp) > 0),
    { message: "id for update, or name + price_egp for create" },
  );

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
  let created = 0;
  const failures: string[] = [];

  for (const row of parsed.data.rows) {
    if (row.id) {
      const { id, ...patch } = row;
      const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      if (Object.keys(clean).length === 0) continue;

      const { error } = await supabase.from("products").update(clean).eq("id", id);
      if (error) failures.push(`${id}: ${error.message}`);
      else updated += 1;
      continue;
    }

    const name = row.name!.trim();
    const inserted = await insertProductWithSlugRetry(
      supabase,
      name,
      row.slug?.trim(),
      (slug) => ({
        slug,
        name,
        title_en: row.title_en ?? null,
        title_ar: null,
        description_en: null,
        description_ar: null,
        description: null,
        category: row.category ?? null,
        sku: row.sku ?? null,
        price_egp: row.price_egp!,
        compare_price_egp: null,
        stock: row.stock ?? 0,
        is_active: row.is_active ?? false,
        image_url: null,
        images: [],
        video_url: null,
        badges: [],
        seasons: [],
        weight_grams: null,
        pieces_count: null,
        dietary: [],
      }),
    );

    if ("error" in inserted) {
      failures.push(`create ${name}: ${inserted.error?.message ?? "failed"}`);
    } else {
      created += 1;
    }
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.import_rows",
    module: "products",
    metadata: { updated, created, attempted: parsed.data.rows.length, failures },
    request: req,
  });

  return NextResponse.json({
    ok: failures.length === 0,
    updated,
    created,
    failures,
  });
}
