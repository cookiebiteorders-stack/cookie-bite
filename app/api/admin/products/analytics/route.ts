import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import { loadProductPerformance } from "@/lib/admin/product-catalog-automation";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  product_ids: z.string().optional(),
});

export async function GET(req: NextRequest) {
  await requireAdminAccess("products");
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid query", "بارامترات غير صالحة"), {
      status: 400,
    });
  }

  const productIds = parsed.data.product_ids
    ? parsed.data.product_ids.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const supabase = createSupabaseAdminClient();
  const rows = await loadProductPerformance(supabase, {
    days: parsed.data.days,
    productIds,
    limit: parsed.data.limit,
  });

  const ids = rows.map((r) => r.product_id);
  const { data: products } =
    ids.length > 0
      ? await supabase.from("products").select("id, name, title_en, slug, sku").in("id", ids)
      : { data: [] };

  const byId = new Map((products ?? []).map((p) => [String(p.id), p]));

  return NextResponse.json({
    days: parsed.data.days,
    rows: rows.map((row) => ({
      ...row,
      product: byId.get(row.product_id) ?? null,
    })),
  });
}
