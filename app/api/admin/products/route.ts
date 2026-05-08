import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  low_stock: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
});

const bulkPatchSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  patch: z
    .object({
      price_egp: z.number().positive().optional(),
      stock: z.number().int().min(0).optional(),
      is_active: z.boolean().optional(),
      category: z.string().max(100).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
      message: "patch is required",
    }),
});

export async function GET(req: NextRequest) {
  await requireAdminAccess("products");
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid query", "بارامترات غير صالحة"), {
      status: 400,
    });
  }

  const { page, limit, search, low_stock, active } = parsed.data;
  const supabase = createSupabaseAdminClient();
  let db = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false });

  if (search?.trim()) {
    const q = search.trim();
    db = db.or(`slug.ilike.%${q}%,name.ilike.%${q}%,sku.ilike.%${q}%`);
  }
  if (typeof low_stock === "boolean" && low_stock) db = db.lte("stock", 10);
  if (typeof active === "boolean") db = db.eq("is_active", active);

  const offset = (page - 1) * limit;
  const { data, count, error } = await db.range(offset, offset + limit - 1);
  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  return NextResponse.json({
    products: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const parsed = bulkPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const { ids, patch } = parsed.data;
  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase.from("products").select("*").in("id", ids);
  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .in("id", ids)
    .select("*");

  if (error) {
    return NextResponse.json(
      bilingualError("Failed to update products", "فشل تحديث المنتجات"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.bulk_update",
    module: "products",
    metadata: { ids, patch, updated_count: data?.length ?? 0 },
    before: before ?? null,
    after: data ?? null,
    request: req,
  });

  return NextResponse.json({ ok: true, updated: data ?? [] });
}

