import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import { zodPayloadError } from "@/lib/validations/zod-errors";
import { revalidateStorefrontCatalog } from "@/lib/storefront/revalidate-catalog";
import { buildIlikeOrClause } from "@/lib/security/sanitize-filter";
import { productsListQuerySchema } from "@/lib/admin/products-list-filters";

const filtersSchema = productsListQuerySchema.omit({ page: true, limit: true });

const priceAdjustmentSchema = z.object({
  mode: z.enum(["percent_add", "percent_subtract", "set_fixed"]),
  value: z.number().positive(),
});

const bodySchema = z
  .object({
    filters: filtersSchema.default({}),
    patch: z
      .object({
        is_active: z.boolean().optional(),
        category: z.string().max(100).nullable().optional(),
        stock: z.number().int().min(0).optional(),
        price_egp: z.number().positive().optional(),
        dietary: z.array(z.string().max(120)).optional(),
      })
      .optional(),
    price_adjustment: priceAdjustmentSchema.optional(),
    smart_rule: z
      .object({
        type: z.enum(["stock_below", "stock_zero", "out_of_stock"]),
        threshold: z.number().int().min(0).optional(),
        action: z.enum(["deactivate", "activate"]).default("deactivate"),
      })
      .optional(),
    max_rows: z.number().int().min(1).max(2000).default(2000),
  })
  .refine((v) => v.patch || v.price_adjustment || v.smart_rule, {
    message: "Provide patch, price_adjustment, or smart_rule",
  });

function applyPriceAdjustment(price: number, mode: z.infer<typeof priceAdjustmentSchema>["mode"], value: number) {
  if (mode === "set_fixed") return Math.max(0.01, value);
  const delta = (price * value) / 100;
  if (mode === "percent_add") return Math.max(0.01, Math.round((price + delta) * 100) / 100);
  return Math.max(0.01, Math.round((price - delta) * 100) / 100);
}

function matchesSmartRule(
  row: { stock: number; is_active: boolean },
  rule: NonNullable<z.infer<typeof bodySchema>["smart_rule"]>,
): boolean {
  if (rule.type === "stock_zero" || rule.type === "out_of_stock") return row.stock <= 0;
  const threshold = rule.threshold ?? 10;
  return row.stock < threshold;
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(zodPayloadError(parsed.error), { status: 400 });
  }

  const { filters, patch, price_adjustment, smart_rule, max_rows } = parsed.data;
  const supabase = createSupabaseAdminClient();

  let db = supabase.from("products").select("id, slug, price_egp, stock, is_active");
  const {
    search,
    low_stock,
    active,
    category,
    price_min,
    price_max,
    stock_state,
    discounted,
    featured,
  } = filters;

  if (search?.trim()) {
    const clause = buildIlikeOrClause(["slug", "name", "sku", "category"], search);
    if (clause) db = db.or(clause);
  }
  if (typeof low_stock === "boolean" && low_stock) db = db.lte("stock", 10);
  if (typeof active === "boolean") db = db.eq("is_active", active);
  if (category?.trim()) db = db.ilike("category", `%${category.trim()}%`);
  if (typeof price_min === "number") db = db.gte("price_egp", price_min);
  if (typeof price_max === "number") db = db.lte("price_egp", price_max);
  if (stock_state === "in_stock") db = db.gt("stock", 10);
  if (stock_state === "low") db = db.gt("stock", 0).lte("stock", 10);
  if (stock_state === "out") db = db.lte("stock", 0);
  if (typeof discounted === "boolean" && discounted) {
    db = db.not("compare_price_egp", "is", null);
  }
  if (typeof featured === "boolean" && featured) {
    db = db.contains("badges", ["featured"]);
  }

  const { data: rows, error } = await db.limit(max_rows);
  if (error) {
    return NextResponse.json(
      bilingualError("Failed to load products", "فشل تحميل المنتجات"),
      { status: 500 },
    );
  }

  type TargetRow = { id: string; slug: string | null; price_egp: number; stock: number; is_active: boolean };

  const targets = (rows ?? []).filter((row: TargetRow) => {
    if (!smart_rule) return true;
    return matchesSmartRule(
      { stock: Number(row.stock ?? 0), is_active: Boolean(row.is_active) },
      smart_rule,
    );
  });

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, matched: 0 });
  }

  const ids = targets.map((r: TargetRow) => String(r.id));
  const { data: before } = await supabase.from("products").select("*").in("id", ids);

  let updatedCount = 0;
  const updatedRows: Record<string, unknown>[] = [];

  if (price_adjustment) {
    for (const row of targets) {
      const current = Number(row.price_egp ?? 0);
      if (!Number.isFinite(current) || current <= 0) continue;
      const nextPrice = applyPriceAdjustment(current, price_adjustment.mode, price_adjustment.value);
      const { data, error: upErr } = await supabase
        .from("products")
        .update({ price_egp: nextPrice })
        .eq("id", row.id)
        .select("*")
        .maybeSingle();
      if (!upErr && data) {
        updatedCount += 1;
        updatedRows.push(data as Record<string, unknown>);
      }
    }
  } else {
    let dbPatch: Record<string, unknown> = { ...(patch ?? {}) };
    if (smart_rule) {
      dbPatch = {
        ...dbPatch,
        is_active: smart_rule.action === "activate",
      };
    }
    const { data, error: upErr } = await supabase
      .from("products")
      .update(dbPatch)
      .in("id", ids)
      .select("*");
    if (upErr) {
      return NextResponse.json(
        bilingualError("Bulk update failed", "فشل التحديث الجماعي"),
        { status: 500 },
      );
    }
    updatedCount = data?.length ?? 0;
    updatedRows.push(...((data ?? []) as Record<string, unknown>[]));
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.bulk_by_filter",
    module: "products",
    metadata: {
      filters,
      patch,
      price_adjustment,
      smart_rule,
      matched: targets.length,
      updated_count: updatedCount,
    },
    before: before ?? null,
    after: updatedRows,
    request: req,
  });

  try {
    await revalidateStorefrontCatalog();
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/api/products");
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({
    ok: true,
    matched: targets.length,
    updated: updatedCount,
  });
}
