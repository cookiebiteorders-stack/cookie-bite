import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";

const querySchema = z.object({
  status: z.string().optional(),
  payment_status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  await requireAdminAccess("orders");
  const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

  const supabase = createSupabaseAdminClient();
  let db = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (query.status) db = db.eq("status", query.status);
  if (query.payment_status) db = db.eq("payment_status", query.payment_status);

  const offset = (query.page - 1) * query.limit;
  const { data, error, count } = await db.range(offset, offset + query.limit - 1);
  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }
  return NextResponse.json({
    orders: data ?? [],
    total: count ?? 0,
    page: query.page,
    limit: query.limit,
  });
}
