import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import { listProductVersions } from "@/lib/admin/product-versions";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  await requireAdminAccess("products");
  const { id } = await context.params;
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  const limit = parsed.success ? parsed.data.limit : 20;

  const supabase = createSupabaseAdminClient();
  const versions = await listProductVersions(supabase, id, limit);

  return NextResponse.json({ product_id: id, versions });
}
