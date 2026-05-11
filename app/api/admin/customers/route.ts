import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import type { AdminCustomerRow, CustomerSegments, CustomerStats } from "@/lib/admin/crm-types";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  tier: z.enum(["bronze", "silver", "gold", "platinum"]).optional(),
  points_min: z.coerce.number().int().optional(),
  points_max: z.coerce.number().int().optional(),
  segment: z.enum(["all", "vip", "new", "inactive", "frequent"]).optional(),
});

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
  created_at: string;
  updated_at: string | null;
};

type OrderLite = {
  user_id: string | null;
  total_egp: number;
  created_at: string;
};

function tierFromPoints(points: number): AdminCustomerRow["loyalty_tier"] {
  if (points >= 3000) return "platinum";
  if (points >= 1500) return "gold";
  if (points >= 600) return "silver";
  return "bronze";
}

async function loadCrmStats(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
): Promise<{ stats: CustomerStats; segments: CustomerSegments }> {
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const d60 = new Date(now.getTime() - 60 * 86400000).toISOString();
  const d90 = new Date(now.getTime() - 90 * 86400000).toISOString();

  const [
    { count: total_customers },
    { count: new_signups_30d },
    { count: loyalty_members },
    { count: vip_gold_plus },
    { count: at_risk_proxy },
    { data: orderRows },
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "customer").gte("created_at", d30),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "customer").gt("points", 0),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "customer").gte("points", 1500),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer")
      .lte("points", 100)
      .lt("created_at", d60),
    supabase.from("orders").select("user_id,total_egp,created_at").not("user_id", "is", null).limit(8000),
  ]);

  const byUserSpend = new Map<string, number>();
  const byUserCount = new Map<string, number>();
  const lastOrder = new Map<string, string>();
  for (const r of (orderRows ?? []) as OrderLite[]) {
    if (!r.user_id) continue;
    byUserSpend.set(r.user_id, (byUserSpend.get(r.user_id) ?? 0) + Number(r.total_egp ?? 0));
    byUserCount.set(r.user_id, (byUserCount.get(r.user_id) ?? 0) + 1);
    const c = r.created_at;
    if (!lastOrder.has(r.user_id) || c > lastOrder.get(r.user_id)!) lastOrder.set(r.user_id, c);
  }

  let returning_with_orders = 0;
  let active_last_90d = 0;
  for (const [, n] of byUserCount) {
    if (n >= 2) returning_with_orders += 1;
  }
  for (const [, last] of lastOrder) {
    if (last >= d90) active_last_90d += 1;
  }

  const ltvs = [...byUserSpend.values()];
  const avg_ltv_sample_egp = ltvs.length ? ltvs.reduce((a, b) => a + b, 0) / ltvs.length : 0;

  const stats: CustomerStats = {
    total_customers: total_customers ?? 0,
    new_signups_30d: new_signups_30d ?? 0,
    returning_with_orders,
    vip_gold_plus: vip_gold_plus ?? 0,
    loyalty_members: loyalty_members ?? 0,
    at_risk_proxy: at_risk_proxy ?? 0,
    avg_ltv_sample_egp,
    active_last_90d,
  };

  const segments: CustomerSegments = {
    new_customers: stats.new_signups_30d,
    returning: stats.returning_with_orders,
    vip: stats.vip_gold_plus,
    at_risk: stats.at_risk_proxy,
  };

  return { stats, segments };
}

export async function GET(req: NextRequest) {
  const actor = await requireAdminAccess("customers");
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid query", "بارامترات غير صالحة"), { status: 400 });
  }

  const { page, limit, search, tier, points_min, points_max, segment } = parsed.data;
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const d60 = new Date(now.getTime() - 60 * 86400000).toISOString();

  let usersQuery = supabase
    .from("users")
    .select("id,email,full_name,avatar_url,points,created_at,updated_at", { count: "exact" })
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    const q = search.trim();
    usersQuery = usersQuery.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  }
  if (typeof points_min === "number") usersQuery = usersQuery.gte("points", points_min);
  if (typeof points_max === "number") usersQuery = usersQuery.lte("points", points_max);
  if (tier === "bronze") usersQuery = usersQuery.lt("points", 600);
  if (tier === "silver") usersQuery = usersQuery.gte("points", 600).lt("points", 1500);
  if (tier === "gold") usersQuery = usersQuery.gte("points", 1500).lt("points", 3000);
  if (tier === "platinum") usersQuery = usersQuery.gte("points", 3000);
  if (segment === "vip") usersQuery = usersQuery.gte("points", 1500);
  if (segment === "new") usersQuery = usersQuery.gte("created_at", d30);
  if (segment === "inactive") usersQuery = usersQuery.lte("points", 100).lt("created_at", d60);
  if (segment === "frequent") usersQuery = usersQuery.gte("points", 600);

  const offset = (page - 1) * limit;
  const [listResult, { stats, segments }] = await Promise.all([
    usersQuery.range(offset, offset + limit - 1),
    loadCrmStats(supabase),
  ]);

  const { data: customers, count, error } = listResult;
  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  const customerRows = (customers ?? []) as UserRow[];
  const customerIds = customerRows.map((u) => u.id);
  const ordersByUser = new Map<
    string,
    { totalOrders: number; totalSpent: number; lastOrderAt: string | null }
  >();

  if (customerIds.length > 0) {
    const { data: orders } = await supabase
      .from("orders")
      .select("user_id,total_egp,created_at")
      .in("user_id", customerIds);

    for (const row of (orders ?? []) as OrderLite[]) {
      if (!row.user_id) continue;
      const prev = ordersByUser.get(row.user_id) ?? {
        totalOrders: 0,
        totalSpent: 0,
        lastOrderAt: null,
      };
      prev.totalOrders += 1;
      prev.totalSpent += Number(row.total_egp || 0);
      if (!prev.lastOrderAt || row.created_at > prev.lastOrderAt) {
        prev.lastOrderAt = row.created_at;
      }
      ordersByUser.set(row.user_id, prev);
    }
  }

  const enriched: AdminCustomerRow[] = customerRows.map((u) => {
    const m = ordersByUser.get(u.id) ?? {
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null,
    };
    return {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      avatar_url: u.avatar_url,
      points: u.points,
      created_at: u.created_at,
      updated_at: u.updated_at,
      total_orders: m.totalOrders,
      total_spent_egp: m.totalSpent,
      last_order_at: m.lastOrderAt,
      loyalty_tier: tierFromPoints(u.points),
    };
  });

  return NextResponse.json({
    customers: enriched,
    total: count ?? 0,
    page,
    limit,
    stats,
    segments,
    meta: {
      role: actor.role,
      permission: actor.permission,
      can_write: actor.permission === "full" || actor.permission === "limited",
      can_delete: actor.permission === "full",
    },
  });
}
