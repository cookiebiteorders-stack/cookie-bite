import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";

const querySchema = z.object({
  module: z.string().optional(),
  action: z.string().optional(),
  actor_id: z.string().uuid().optional(),
  entity_id: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(req: NextRequest) {
  await requireAdminAccess("audit");

  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid query", "بارامترات غير صالحة"),
      { status: 400 },
    );
  }
  const q = parsed.data;

  const supabase = createSupabaseAdminClient();
  let db = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (q.module) db = db.eq("module", q.module);
  if (q.action) db = db.eq("action", q.action);
  if (q.actor_id) db = db.eq("actor_id", q.actor_id);
  if (q.entity_id) db = db.eq("entity_id", q.entity_id);
  if (q.from) db = db.gte("created_at", q.from);
  if (q.to) db = db.lte("created_at", q.to);

  const offset = (q.page - 1) * q.limit;
  const { data, error, count } = await db.range(offset, offset + q.limit - 1);
  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  return NextResponse.json({
    logs: data ?? [],
    total: count ?? 0,
    page: q.page,
    limit: q.limit,
  });
}
