import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import type { AdminCustomerRow, AddressRow, OrderSummaryRow } from "@/lib/admin/crm-types";

function tierFromPoints(points: number): AdminCustomerRow["loyalty_tier"] {
  if (points >= 3000) return "platinum";
  if (points >= 1500) return "gold";
  if (points >= 600) return "silver";
  return "bronze";
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdminAccess("customers");
  const { id } = await ctx.params;
  const supabase = createSupabaseAdminClient();

  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("id,email,full_name,avatar_url,points,created_at,updated_at,clerk_user_id,role")
    .eq("id", id)
    .eq("role", "customer")
    .maybeSingle();

  if (userErr || !user) {
    return NextResponse.json(bilingualError("Customer not found", "العميل غير موجود"), { status: 404 });
  }

  const [{ data: orders }, { data: sums }, { count: orderCount }, { data: addresses }] = await Promise.all([
    supabase
      .from("orders")
      .select("id,order_code,total_egp,status,payment_status,created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("orders").select("total_egp,created_at").eq("user_id", id).limit(5000),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase
      .from("addresses")
      .select("id,label,recipient,phone,street,city,governorate,is_default")
      .eq("user_id", id)
      .order("is_default", { ascending: false }),
  ]);

  const orderRows = (orders ?? []) as OrderSummaryRow[];
  let totalSpent = 0;
  let lastOrderAt: string | null = null;
  for (const r of sums ?? []) {
    const row = r as { total_egp?: number; created_at?: string };
    totalSpent += Number(row.total_egp ?? 0);
    const c = row.created_at;
    if (c && (!lastOrderAt || c > lastOrderAt)) lastOrderAt = c;
  }

  const customer: AdminCustomerRow = {
    id: user.id as string,
    email: user.email as string,
    full_name: (user.full_name as string | null) ?? null,
    avatar_url: (user.avatar_url as string | null) ?? null,
    points: user.points as number,
    created_at: user.created_at as string,
    updated_at: (user.updated_at as string | null) ?? null,
    total_orders: orderCount ?? 0,
    total_spent_egp: totalSpent,
    last_order_at: lastOrderAt,
    loyalty_tier: tierFromPoints(user.points as number),
  };

  return NextResponse.json({
    customer: { ...customer, clerk_user_id: user.clerk_user_id as string },
    orders: orderRows,
    addresses: (addresses ?? []) as AddressRow[],
  });
}

const patchSchema = z
  .object({
    full_name: z.string().min(1).max(160).optional(),
    points: z.number().int().min(0).max(2_000_000).optional(),
  })
  .refine((d) => d.full_name !== undefined || d.points !== undefined, { message: "empty patch" });

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminAccess("customers");
  requireWritePermission(actor);

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), { status: 400 });
  }

  const { id } = await ctx.params;
  const patch: Record<string, unknown> = {};
  if (parsed.data.full_name !== undefined) patch.full_name = parsed.data.full_name.trim();
  if (parsed.data.points !== undefined) patch.points = parsed.data.points;

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
  const { data: after, error } = await supabase.from("users").update(patch).eq("id", id).select("*").single();
  if (error || !after) {
    return NextResponse.json(bilingualError("Failed to update customer", "فشل تحديث العميل"), { status: 500 });
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "customers.update",
    module: "customers",
    entity_id: id,
    before: before ?? null,
    after,
    metadata: { patch },
    request: req,
  });

  return NextResponse.json({ ok: true, customer: after });
}
