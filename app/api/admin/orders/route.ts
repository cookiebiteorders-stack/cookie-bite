import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import { writeAuditLog } from "@/lib/admin/audit";
import { recordOrderCreatedLifecycle } from "@/lib/orders/order-lifecycle";
import type { AdminOrderRow, OrderStats } from "@/lib/admin/orders-operations-types";
import { buildIlikeOrClause } from "@/lib/security/sanitize-filter";

const querySchema = z.object({
  status: z.string().optional(),
  payment_status: z.string().optional(),
  search: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  total_min: z.coerce.number().nonnegative().optional(),
  total_max: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function utcStartOfDay(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

function mapOrderRow(row: Record<string, unknown>): AdminOrderRow {
  const oi = row.order_items as { count?: number }[] | undefined;
  const rawCount = Array.isArray(oi) && oi[0] && typeof oi[0].count === "number" ? oi[0].count : null;
  const rest = { ...row };
  delete rest.order_items;
  return {
    ...(rest as Omit<AdminOrderRow, "items_count">),
    items_count: rawCount ?? 0,
  };
}

async function loadOrderStats(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
): Promise<OrderStats> {
  const now = new Date();
  const startToday = utcStartOfDay(now);
  const startYesterday = new Date(startToday);
  startYesterday.setUTCDate(startYesterday.getUTCDate() - 1);
  const startYesterdayIso = startYesterday.toISOString();

  const [
    { count: pending },
    { count: processing },
    { count: shipped },
    { count: delivered },
    { count: cancelled },
    { count: returned },
    { count: failed_payments },
    { count: orders_today },
    { count: orders_yesterday },
    { data: paidTodayRows },
  ] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending").is("deleted_at", null),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "processing").is("deleted_at", null),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "shipped").is("deleted_at", null),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered").is("deleted_at", null),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "cancelled").is("deleted_at", null),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "refunded").is("deleted_at", null),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "failed").is("deleted_at", null),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", startToday).is("deleted_at", null),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startYesterdayIso)
      .lt("created_at", startToday)
      .is("deleted_at", null),
    supabase
      .from("orders")
      .select("total_egp")
      .eq("payment_status", "paid")
      .gte("created_at", startToday)
      .is("deleted_at", null)
      .limit(8000),
  ]);

  const revenue_today_egp = (paidTodayRows ?? []).reduce(
    (s, r) => s + Number((r as { total_egp?: number }).total_egp ?? 0),
    0,
  );

  return {
    pending: pending ?? 0,
    processing: processing ?? 0,
    packed: 0,
    shipped: shipped ?? 0,
    delivered: delivered ?? 0,
    returned: returned ?? 0,
    cancelled: cancelled ?? 0,
    failed_payments: failed_payments ?? 0,
    revenue_today_egp,
    orders_today: orders_today ?? 0,
    orders_yesterday: orders_yesterday ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const actor = await requireAdminAccess("orders");
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid query", "بارامترات غير صالحة"), { status: 400 });
  }

  const q = parsed.data;
  const supabase = createSupabaseAdminClient();

  let db = supabase
    .from("orders")
    .select("*, order_items(count)", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (q.status) db = db.eq("status", q.status);
  if (q.payment_status) db = db.eq("payment_status", q.payment_status);
  if (q.search?.trim()) {
    const clause = buildIlikeOrClause(["order_code", "guest_email"], q.search);
    if (clause) db = db.or(clause);
  }
  if (q.date_from) db = db.gte("created_at", q.date_from);
  if (q.date_to) db = db.lte("created_at", q.date_to);
  if (typeof q.total_min === "number") db = db.gte("total_egp", q.total_min);
  if (typeof q.total_max === "number") db = db.lte("total_egp", q.total_max);

  const offset = (q.page - 1) * q.limit;
  const [listResult, stats] = await Promise.all([db.range(offset, offset + q.limit - 1), loadOrderStats(supabase)]);

  const { data, error, count } = listResult;
  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  const orders = (data ?? []).map((row) => mapOrderRow(row as Record<string, unknown>));

  return NextResponse.json({
    orders,
    total: count ?? 0,
    page: q.page,
    limit: q.limit,
    stats,
    meta: {
      role: actor.role,
      permission: actor.permission,
      can_write: actor.permission === "full" || actor.permission === "limited",
      can_delete: actor.permission === "full",
    },
  });
}

const manualOrderSchema = z.object({
  guest_email: z.string().email(),
  guest_phone: z.string().min(8).max(32),
  shipping_address: z
    .object({
      name: z.string().min(2).max(160),
      street: z.string().min(3).max(240),
      city: z.string().min(2).max(120),
    })
    .passthrough(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(40),
  payment_method: z.string().max(40).default("cod"),
  notes: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("orders");
  requireWritePermission(actor);

  const parsed = manualOrderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const ids = [...new Set(parsed.data.items.map((i) => i.product_id))];
  const { data: prodRows, error: prodErr } = await supabase
    .from("products")
    .select("id,slug,name,title_en,price_egp")
    .in("id", ids);

  if (prodErr || !prodRows?.length) {
    return NextResponse.json(bilingualError("Products not found", "المنتجات غير موجودة"), { status: 400 });
  }

  const priceMap = new Map(
    (prodRows as Array<{ id: string; slug: string | null; name: string; title_en: string | null; price_egp: number }>).map((p) => [
      p.id,
      {
        slug: p.slug ?? `product-${p.id}`,
        label: (p.title_en ?? p.name ?? "Product").slice(0, 200),
        price: Number(p.price_egp),
      },
    ]),
  );

  let subtotal = 0;
  const lineRows: Array<{
    product_id: string;
    product_name: string;
    slug: string;
    unit_price_egp: number;
    quantity: number;
  }> = [];

  for (const line of parsed.data.items) {
    const meta = priceMap.get(line.product_id);
    if (!meta) {
      return NextResponse.json(bilingualError("Unknown product in cart", "منتج غير معروف في الطلب"), {
        status: 400,
      });
    }
    const lineTotal = meta.price * line.quantity;
    subtotal += lineTotal;
    lineRows.push({
      product_id: line.product_id,
      product_name: meta.label,
      slug: meta.slug,
      unit_price_egp: meta.price,
      quantity: line.quantity,
    });
  }

  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  const shipping = {
    ...parsed.data.shipping_address,
    phone: parsed.data.guest_phone,
  };

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      guest_email: parsed.data.guest_email,
      status: "pending",
      payment_status: "unpaid",
      payment_method: parsed.data.payment_method,
      subtotal_egp: subtotal,
      delivery_fee_egp: deliveryFee,
      total_egp: total,
      notes: parsed.data.notes ?? null,
      shipping_address: shipping,
    })
    .select("*")
    .single();

  if (orderErr || !order) {
    return NextResponse.json(bilingualError("Failed to create order", "فشل إنشاء الطلب"), { status: 500 });
  }

  const orderId = order.id as string;

  const itemsPayload = lineRows.map((r) => ({
    order_id: orderId,
    product_id: r.product_id,
    product_name: r.product_name,
    slug: r.slug,
    unit_price_egp: r.unit_price_egp,
    unit_price: r.unit_price_egp,
    quantity: r.quantity,
    total_price_egp: r.unit_price_egp * r.quantity,
    total_price: r.unit_price_egp * r.quantity,
  }));

  const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
  if (itemsErr) {
    await supabase.from("orders").delete().eq("id", orderId);
    return NextResponse.json(bilingualError("Failed to add order lines", "فشل إضافة بنود الطلب"), {
      status: 500,
    });
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "orders.create_manual",
    module: "orders",
    entity_id: orderId,
    after: order,
    metadata: { lines: itemsPayload.length },
    request: req,
  });

  void recordOrderCreatedLifecycle(
    supabase,
    order as Record<string, unknown>,
    itemsPayload as Record<string, unknown>[],
    { user_id: actor.user_id, email: actor.email, role: actor.role },
  );

  return NextResponse.json({ ok: true, order }, { status: 201 });
}
