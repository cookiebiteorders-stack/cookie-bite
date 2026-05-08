import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

type CustomerRow = {
  id: string;
  email: string;
  full_name: string | null;
  points: number;
  created_at: string;
};

type OrderLite = {
  user_id: string | null;
  total_egp: number;
  created_at: string;
};

export async function GET(req: NextRequest) {
  await requireAdminAccess("customers");

  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid query", "بارامترات غير صالحة"),
      { status: 400 },
    );
  }

  const { page, limit, search } = parsed.data;
  const supabase = createSupabaseAdminClient();
  let usersQuery = supabase
    .from("users")
    .select("id,email,full_name,points,created_at", { count: "exact" })
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    const q = search.trim();
    usersQuery = usersQuery.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  }

  const offset = (page - 1) * limit;
  const { data: customers, count, error } = await usersQuery.range(
    offset,
    offset + limit - 1,
  );
  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  const customerRows = (customers ?? []) as CustomerRow[];
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

  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

  let newCustomers = 0;
  let returning = 0;
  let vip = 0;
  let atRisk = 0;

  const enriched = customerRows.map((u) => {
    const m = ordersByUser.get(u.id) ?? {
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null,
    };

    if (m.totalOrders <= 1) newCustomers += 1;
    if (m.totalOrders >= 2) returning += 1;
    if (m.totalSpent >= 3000 || u.points >= 1000) vip += 1;
    if (m.lastOrderAt) {
      const lastMs = new Date(m.lastOrderAt).getTime();
      if (now - lastMs > NINETY_DAYS) atRisk += 1;
    } else if (now - new Date(u.created_at).getTime() > THIRTY_DAYS) {
      atRisk += 1;
    }

    return {
      ...u,
      total_orders: m.totalOrders,
      total_spent_egp: m.totalSpent,
      last_order_at: m.lastOrderAt,
      loyalty_tier:
        u.points >= 3000
          ? "platinum"
          : u.points >= 1500
            ? "gold"
            : u.points >= 600
              ? "silver"
              : "bronze",
    };
  });

  return NextResponse.json({
    customers: enriched,
    total: count ?? 0,
    page,
    limit,
    segments: {
      new_customers: newCustomers,
      returning,
      vip,
      at_risk: atRisk,
    },
  });
}

