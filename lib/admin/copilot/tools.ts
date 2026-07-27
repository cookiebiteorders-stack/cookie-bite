/**
 * Cookie Bite — Admin Copilot tools.
 *
 * Gemini supports native function-calling: we declare the tools here (as
 * `FunctionDeclaration[]`) AND map each name to a server-side handler. The
 * runner (`runner.ts`) loops: ask Gemini → if it requests a tool → run it
 * → feed the result back → ask Gemini again → finally emit text.
 *
 * Design rules:
 *   - قراءة افتراضياً؛ أدوات الكتابة (`cancel_order`, `update_product_stock`) تتطلّب
 *     تأكيداً صريحاً (`confirm:true`) بعد موافقة الأدمن في المحادثة، وتُسجَّل في audit_logs.
 *   - Every handler is wrapped in try/catch and always returns JSON the
 *     model can parse — even errors carry a "warning" string so Gemini can
 *     gracefully tell the admin what failed.
 *   - We never return raw PII like card numbers. Phones/emails are passed
 *     through because admins legitimately need them, but we trim payloads
 *     to keep the prompt small.
 */

import type { FunctionDeclaration } from "@google/generative-ai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import type { UserRole } from "@/lib/admin/rbac";
import { buildIlikeOrClause } from "@/lib/security/sanitize-filter";
import { create_discount, update_order_status } from "@/lib/admin/copilot/write-handlers";
import { masterToolsAsGemini, resolveToolName } from "@/lib/admin/copilot/tool-registry";
import { OPERATOR_TOOL_HANDLERS, list_products } from "@/lib/admin/copilot/operator-handlers";

/* -------------------------------------------------------------------------- *
 * Helpers                                                                     *
 * -------------------------------------------------------------------------- */

export type CopilotToolActor = {
  role: UserRole;
  email: string | null;
  user_id: string | null;
  supabase_user_id: string;
};

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;
type Handler = (args: Record<string, unknown>, actor: CopilotToolActor) => Promise<Json>;

function toIsoStart(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}
function toIsoEnd(daysAgo = 0): string {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function safe<T>(v: T | null | undefined, fallback: T): T {
  return v == null ? fallback : v;
}

// Tiny limiter so the model never blows up its context window with rows.
const ROW_HARD_LIMIT = 50;

/* -------------------------------------------------------------------------- *
 * Handlers                                                                    *
 * -------------------------------------------------------------------------- */

async function get_dashboard_summary(_args: Record<string, unknown>, _actor: CopilotToolActor): Promise<Json> {
  void _args;
  void _actor;
  try {
    const sb = createSupabaseAdminClient();
    const todayStart = toIsoStart(0);
    const yesterdayStart = toIsoStart(1);
    const yesterdayEnd = toIsoEnd(1);
    const weekAgoStart = toIsoStart(6);

    const [
      todayOrders,
      yesterdayOrders,
      weekOrders,
      newCustomersToday,
      pendingCount,
      lowStockCount,
      failedPay24h,
    ] = await Promise.all([
      sb.from("orders").select("total_egp,created_at,status").gte("created_at", todayStart),
      sb
        .from("orders")
        .select("total_egp,created_at")
        .gte("created_at", yesterdayStart)
        .lte("created_at", yesterdayEnd),
      sb.from("orders").select("total_egp,created_at").gte("created_at", weekAgoStart),
      sb
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer")
        .gte("created_at", todayStart),
      sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("products").select("id", { count: "exact", head: true }).lte("stock", 5).eq("is_active", true),
      sb
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "failed")
        .gte("created_at", toIsoStart(1)),
    ]);

    const todayRows = (todayOrders.data ?? []) as Array<{ total_egp: number; status: string | null }>;
    const ydayRows = (yesterdayOrders.data ?? []) as Array<{ total_egp: number }>;
    const weekRows = (weekOrders.data ?? []) as Array<{ total_egp: number }>;

    const revenueToday = todayRows.reduce((a, r) => a + num(r.total_egp), 0);
    const revenueYesterday = ydayRows.reduce((a, r) => a + num(r.total_egp), 0);
    const revenueWeek = weekRows.reduce((a, r) => a + num(r.total_egp), 0);
    const ordersToday = todayRows.length;
    const ordersYesterday = ydayRows.length;

    return {
      today: {
        revenue_egp: Math.round(revenueToday),
        orders: ordersToday,
        new_customers: newCustomersToday.count ?? 0,
        avg_order_value_egp: ordersToday ? Math.round(revenueToday / ordersToday) : 0,
      },
      yesterday: {
        revenue_egp: Math.round(revenueYesterday),
        orders: ordersYesterday,
      },
      week_to_date: {
        revenue_egp: Math.round(revenueWeek),
        orders: weekRows.length,
      },
      operational: {
        pending_orders: pendingCount.count ?? 0,
        low_stock_skus: lowStockCount.count ?? 0,
        failed_payments_last_24h: failedPay24h.count ?? 0,
      },
      deltas: {
        revenue_vs_yesterday_pct:
          revenueYesterday > 0 ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100) : null,
        orders_vs_yesterday_pct:
          ordersYesterday > 0 ? Math.round(((ordersToday - ordersYesterday) / ordersYesterday) * 100) : null,
      },
    };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "Failed to load dashboard summary" };
  }
}

async function search_orders(args: Record<string, unknown>, _actor: CopilotToolActor): Promise<Json> {
  void _actor;
  try {
    const sb = createSupabaseAdminClient();
    const status = typeof args.status === "string" ? args.status : null;
    const payment_status = typeof args.payment_status === "string" ? args.payment_status : null;
    const days = Math.max(1, Math.min(180, num(args.days ?? 7)));
    const limit = Math.max(1, Math.min(ROW_HARD_LIMIT, num(args.limit ?? 20)));
    const customer_email = typeof args.customer_email === "string" ? args.customer_email.trim() : null;

    let q = sb
      .from("orders")
      .select("id,order_number,status,payment_status,total_egp,created_at,user_id,shipping_address")
      .gte("created_at", toIsoStart(days))
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) q = q.eq("status", status);
    if (payment_status) q = q.eq("payment_status", payment_status);

    if (customer_email) {
      const { data: user } = await sb
        .from("users")
        .select("id")
        .ilike("email", customer_email)
        .maybeSingle();
      if (user?.id) q = q.eq("user_id", user.id as string);
      else return { warning: `No customer found with email "${customer_email}".`, orders: [] };
    }

    const { data, error } = await q;
    if (error) return { warning: error.message, orders: [] };
    const rows = (data ?? []) as Array<{
      id: string;
      order_number?: string | number | null;
      status: string | null;
      payment_status: string | null;
      total_egp: number;
      created_at: string;
      shipping_address?: { name?: string; phone?: string } | null;
    }>;
    return {
      count: rows.length,
      orders: rows.map((o) => ({
        id: o.id,
        order_number: o.order_number ?? null,
        status: o.status,
        payment_status: o.payment_status,
        total_egp: num(o.total_egp),
        created_at: o.created_at,
        customer_name: o.shipping_address?.name ?? null,
        customer_phone_masked: maskPhone(o.shipping_address?.phone ?? null),
      })),
    };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "search_orders failed", orders: [] };
  }
}

async function get_order_details(args: Record<string, unknown>, _actor: CopilotToolActor): Promise<Json> {
  void _actor;
  try {
    const sb = createSupabaseAdminClient();
    const id = typeof args.id === "string" ? args.id : null;
    const order_number = typeof args.order_number === "string" || typeof args.order_number === "number"
      ? String(args.order_number).replace(/^#/, "")
      : null;
    if (!id && !order_number) return { warning: "Provide either 'id' or 'order_number'." };

    let q = sb.from("orders").select("*").limit(1);
    if (id) q = q.eq("id", id);
    else if (order_number) q = q.eq("order_number", order_number);

    const { data, error } = await q.maybeSingle();
    if (error || !data) return { warning: error?.message ?? "Order not found." };

    const { fetchOrderItemsByOrderIds } = await import("@/lib/db/order-items-fetch");
    const orderId = data.id as string;
    const itemsMap = await fetchOrderItemsByOrderIds(sb, [orderId]);
    const items = itemsMap.get(orderId) ?? [];
    const ship = (data.shipping_address ?? {}) as { name?: string; phone?: string; city?: string };

    return {
      id: data.id,
      order_number: data.order_number ?? null,
      status: data.status,
      payment_status: data.payment_status,
      total_egp: num(data.total_egp),
      created_at: data.created_at,
      customer_name: ship.name ?? null,
      customer_phone_masked: maskPhone(ship.phone ?? null),
      shipping_city: ship.city ?? null,
      payment_method: data.payment_method ?? null,
      items: items.map((it) => ({
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price_egp: it.unit_price_egp,
        total_price_egp: it.total_price_egp,
      })),
    };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "get_order_details failed" };
  }
}

async function search_products(args: Record<string, unknown>, _actor: CopilotToolActor): Promise<Json> {
  void _actor;
  try {
    const sb = createSupabaseAdminClient();
    const query = typeof args.query === "string" ? args.query.trim() : "";
    const low_stock_threshold = args.low_stock_threshold == null ? null : Math.max(0, num(args.low_stock_threshold));
    const only_active = args.only_active !== false;
    const limit = Math.max(1, Math.min(ROW_HARD_LIMIT, num(args.limit ?? 20)));

    let q = sb.from("products").select("id,name,price_egp,stock,category,is_active,created_at").limit(limit).order("stock", { ascending: true });
    if (only_active) q = q.eq("is_active", true);
    if (query) q = q.ilike("name", `%${query}%`);
    if (low_stock_threshold != null) q = q.lte("stock", low_stock_threshold);

    const { data, error } = await q;
    if (error) return { warning: error.message, products: [] };
    const rows = (data ?? []) as Array<{
      id: string;
      name: string;
      price_egp: number;
      stock: number;
      category: string | null;
      is_active: boolean;
    }>;
    return {
      count: rows.length,
      products: rows.map((p) => ({
        id: p.id,
        name: p.name,
        price_egp: num(p.price_egp),
        stock: num(p.stock),
        category: p.category,
        is_active: p.is_active,
      })),
    };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "search_products failed", products: [] };
  }
}

async function search_customers(args: Record<string, unknown>, _actor: CopilotToolActor): Promise<Json> {
  void _actor;
  try {
    const sb = createSupabaseAdminClient();
    const query = typeof args.query === "string" ? args.query.trim() : "";
    const limit = Math.max(1, Math.min(ROW_HARD_LIMIT, num(args.limit ?? 20)));

    let q = sb.from("users").select("id,email,name,phone,created_at,points").eq("role", "customer").limit(limit);
    if (query) {
      const clause = buildIlikeOrClause(["email", "name", "phone"], query);
      if (clause) q = q.or(clause);
    }
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) return { warning: error.message, customers: [] };

    const rows = (data ?? []) as Array<{
      id: string;
      email: string | null;
      name: string | null;
      phone: string | null;
      created_at: string;
      points: number | null;
    }>;

    // Enrich with order count + LTV (capped: only for the top 8 to keep it fast).
    const enriched = await Promise.all(
      rows.slice(0, 8).map(async (u) => {
        const { data: orders } = await sb
          .from("orders")
          .select("total_egp,created_at")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false })
          .limit(500);
        const arr = (orders ?? []) as Array<{ total_egp: number; created_at: string }>;
        const ltv = arr.reduce((a, r) => a + num(r.total_egp), 0);
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          phone_masked: maskPhone(u.phone),
          joined: u.created_at,
          points: num(u.points),
          orders_count: arr.length,
          ltv_egp: Math.round(ltv),
          last_order: arr[0]?.created_at ?? null,
        };
      }),
    );

    return { count: rows.length, customers: enriched };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "search_customers failed", customers: [] };
  }
}

async function get_top_products(args: Record<string, unknown>, _actor: CopilotToolActor): Promise<Json> {
  void _actor;
  try {
    const sb = createSupabaseAdminClient();
    const days = Math.max(1, Math.min(180, num(args.days ?? 30)));
    const limit = Math.max(1, Math.min(20, num(args.limit ?? 10)));

    // Read order_items joined in two steps (safer than complex Supabase joins).
    const { data: recent } = await sb
      .from("orders")
      .select("id")
      .gte("created_at", toIsoStart(days))
      .limit(2000);
    const orderIds = (recent ?? []).map((r: { id: string }) => r.id);
    if (orderIds.length === 0) return { count: 0, products: [] };

    const { fetchOrderItemsByOrderIds } = await import("@/lib/db/order-items-fetch");
    const itemsMap = await fetchOrderItemsByOrderIds(sb, orderIds);
    const allItems = Array.from(itemsMap.values()).flat();

    const agg = new Map<string, { qty: number; revenue: number }>();
    for (const it of allItems) {
      const key = it.product_name || "Unknown";
      const cur = agg.get(key) ?? { qty: 0, revenue: 0 };
      cur.qty += num(it.quantity);
      cur.revenue += num(it.total_price_egp ?? it.unit_price_egp * it.quantity);
      agg.set(key, cur);
    }
    const list = Array.from(agg.entries())
      .map(([name, v]) => ({ name, units_sold: v.qty, revenue_egp: Math.round(v.revenue) }))
      .sort((a, b) => b.units_sold - a.units_sold)
      .slice(0, limit);

    return { period_days: days, count: list.length, products: list };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "get_top_products failed", products: [] };
  }
}

async function get_sales_report(args: Record<string, unknown>, _actor: CopilotToolActor): Promise<Json> {
  void _actor;
  try {
    const sb = createSupabaseAdminClient();
    const days = Math.max(1, Math.min(180, num(args.days ?? 30)));
    const { data } = await sb
      .from("orders")
      .select("total_egp,created_at,status")
      .gte("created_at", toIsoStart(days))
      .limit(5000);
    const rows = (data ?? []) as Array<{ total_egp: number; created_at: string; status: string | null }>;
    const byDay = new Map<string, { revenue: number; orders: number }>();
    for (const r of rows) {
      const k = r.created_at.slice(0, 10);
      const cur = byDay.get(k) ?? { revenue: 0, orders: 0 };
      cur.revenue += num(r.total_egp);
      cur.orders += 1;
      byDay.set(k, cur);
    }
    const series = Array.from(byDay.entries())
      .map(([date, v]) => ({ date, revenue_egp: Math.round(v.revenue), orders: v.orders }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const totalRevenue = series.reduce((a, s) => a + s.revenue_egp, 0);
    const totalOrders = series.reduce((a, s) => a + s.orders, 0);
    return {
      period_days: days,
      total_revenue_egp: totalRevenue,
      total_orders: totalOrders,
      avg_order_value_egp: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
      daily: series,
    };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "get_sales_report failed" };
  }
}

async function list_discounts(args: Record<string, unknown>, _actor: CopilotToolActor): Promise<Json> {
  void _actor;
  try {
    const sb = createSupabaseAdminClient();
    const status = typeof args.status === "string" ? args.status : null;
    const limit = Math.max(1, Math.min(ROW_HARD_LIMIT, num(args.limit ?? 25)));
    let q = sb.from("promo_codes").select("*").order("created_at", { ascending: false }).limit(limit);
    if (status === "active") q = q.eq("is_active", true);
    if (status === "expired") q = q.eq("is_active", false);
    const { data, error } = await q;
    if (error) return { warning: error.message, discounts: [] };
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    return {
      count: rows.length,
      discounts: rows.map((r) => ({
        code: r.code,
        type: r.discount_type ?? r.type ?? null,
        value: r.discount_value ?? r.value ?? null,
        min_order_egp: r.min_order_value ?? null,
        usage: r.usage_count ?? 0,
        usage_limit: r.usage_limit ?? null,
        is_active: r.is_active ?? null,
        starts_at: r.starts_at ?? null,
        ends_at: r.ends_at ?? r.expires_at ?? null,
      })),
    };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "list_discounts failed", discounts: [] };
  }
}

async function list_recent_audit_logs(args: Record<string, unknown>, _actor: CopilotToolActor): Promise<Json> {
  void _actor;
  try {
    const sb = createSupabaseAdminClient();
    const days = Math.max(1, Math.min(30, num(args.days ?? 7)));
    const limit = Math.max(1, Math.min(ROW_HARD_LIMIT, num(args.limit ?? 25)));
    const action = typeof args.action === "string" ? args.action : null;
    let q = sb
      .from("audit_logs")
      .select("id,actor_email,action,entity,entity_id,created_at,summary")
      .gte("created_at", toIsoStart(days))
      .order("created_at", { ascending: false })
      .limit(limit);
    if (action) q = q.ilike("action", `%${action}%`);
    const { data, error } = await q;
    if (error) return { warning: error.message, logs: [] };
    return { count: (data ?? []).length, logs: data ?? [] };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "list_recent_audit_logs failed", logs: [] };
  }
}

async function cancel_order(args: Record<string, unknown>, actor: CopilotToolActor): Promise<Json> {
  try {
    const confirm = args.confirm === true;
    const order_id = typeof args.order_id === "string" ? args.order_id : null;
    if (!order_id) return { warning: "order_id (uuid) is required." };
    if (!confirm) {
      return {
        dry_run: true,
        hint: "Re-call with confirm:true only after the admin explicitly approves cancelling this order.",
        order_id,
      };
    }
    if (actor.role === "staff") {
      return { warning: "Staff cannot cancel orders via copilot — use an owner/admin account." };
    }
    const sb = createSupabaseAdminClient();
    const { data: before } = await sb.from("orders").select("*").eq("id", order_id).maybeSingle();
    if (!before) return { warning: "Order not found." };
    const { data: after, error } = await sb
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order_id)
      .select("*")
      .single();
    if (error || !after) return { warning: error?.message ?? "Failed to update order." };
    await writeAuditLog({
      actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
      action: "copilot.order.cancel",
      module: "orders",
      entity_id: order_id,
      before,
      after,
      metadata: { source: "copilot", supabase_user_id: actor.supabase_user_id },
    });
    return { ok: true, order_id, status: after.status };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "cancel_order failed" };
  }
}

async function update_product_stock(args: Record<string, unknown>, actor: CopilotToolActor): Promise<Json> {
  try {
    const confirm = args.confirm === true;
    const product_id = typeof args.product_id === "string" ? args.product_id : null;
    const stock = Math.floor(num(args.stock));
    if (!product_id) return { warning: "product_id (uuid) is required." };
    if (!Number.isFinite(stock) || stock < 0) return { warning: "stock must be a non-negative integer." };
    if (!confirm) {
      return {
        dry_run: true,
        hint: "Re-call with confirm:true after explicit admin approval.",
        product_id,
        stock,
      };
    }
    if (actor.role === "staff") {
      return { warning: "Staff cannot adjust inventory via copilot." };
    }
    const sb = createSupabaseAdminClient();
    const { data: before } = await sb.from("products").select("*").eq("id", product_id).maybeSingle();
    if (!before) return { warning: "Product not found." };
    const { data: after, error } = await sb
      .from("products")
      .update({ stock })
      .eq("id", product_id)
      .select("*")
      .single();
    if (error || !after) return { warning: error?.message ?? "Failed to update stock." };
    await writeAuditLog({
      actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
      action: "copilot.product.set_stock",
      module: "products",
      entity_id: product_id,
      before,
      after,
      metadata: { source: "copilot", supabase_user_id: actor.supabase_user_id },
    });
    return { ok: true, product_id, stock: after.stock };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "update_product_stock failed" };
  }
}

function maskPhone(p: string | null | undefined): string | null {
  if (!p) return null;
  const digits = String(p).replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `${digits.slice(0, 3)} *** ${digits.slice(-3)}`;
}

/* -------------------------------------------------------------------------- *
 * Gemini function declarations                                                *
 *                                                                              *
 * We use plain literals for type values (STRING/NUMBER/BOOLEAN/OBJECT). The   *
 * Gemini SDK's `Schema` union is too strict for a small object literal (it   *
 * narrows by `type` literal at compile-time and wants `properties` even for  *
 * primitives). At runtime the API just needs the right strings, so we cast   *
 * the whole array to `FunctionDeclaration[]` at the end.                     *
 * -------------------------------------------------------------------------- */

const STR = "STRING";
const NUM = "NUMBER";
const BOOL = "BOOLEAN";
const OBJ = "OBJECT";

export const TOOL_DECLARATIONS = [
  ...masterToolsAsGemini(),
  {
    name: "get_dashboard_summary",
    description:
      "Get today's revenue, order count, new customers, and operational alerts (pending orders, low stock, failed payments). Use whenever the admin asks 'how is today going', 'summary', 'overview', etc.",
    parameters: { type: OBJ, properties: {} },
  },
  {
    name: "search_orders",
    description:
      "Search orders in the last N days. Optionally filter by status (pending, processing, shipped, delivered, cancelled, refunded) or payment_status (paid, unpaid, failed) or a customer email.",
    parameters: {
      type: OBJ,
      properties: {
        status: { type: STR, description: "pending|processing|shipped|delivered|cancelled|refunded" },
        payment_status: { type: STR, description: "paid|unpaid|failed" },
        days: { type: NUM, description: "How many days back to search (default 7, max 180)." },
        limit: { type: NUM, description: "Max rows to return (default 20, max 50)." },
        customer_email: { type: STR, description: "Filter to orders by this customer email." },
      },
    },
  },
  {
    name: "get_order_details",
    description: "Get full detail of one order, including items. Provide either id (uuid) or order_number.",
    parameters: {
      type: OBJ,
      properties: {
        id: { type: STR },
        order_number: { type: STR },
      },
    },
  },
  {
    name: "search_customers",
    description:
      "Look up customers by email/name/phone. Enriches the first 8 with order count, lifetime value, and last-order date.",
    parameters: {
      type: OBJ,
      properties: {
        query: { type: STR, description: "Substring of email, name, or phone." },
        limit: { type: NUM },
      },
    },
  },
  {
    name: "get_top_products",
    description: "Top-selling products by units sold in the last N days (default 30).",
    parameters: {
      type: OBJ,
      properties: {
        days: { type: NUM },
        limit: { type: NUM, description: "Top N (default 10, max 20)." },
      },
    },
  },
  {
    name: "get_sales_report",
    description:
      "Aggregate sales for the last N days: total revenue, order count, AOV, and a daily series. Use for questions like 'how was the last week / month'.",
    parameters: {
      type: OBJ,
      properties: {
        days: { type: NUM, description: "Default 30, max 180." },
      },
    },
  },
  {
    name: "list_discounts",
    description: "List discount / promo codes. Optional status filter.",
    parameters: {
      type: OBJ,
      properties: {
        status: { type: STR, description: "active|expired" },
        limit: { type: NUM },
      },
    },
  },
  {
    name: "list_recent_audit_logs",
    description:
      "Recent admin actions from audit_logs (last N days). Optional 'action' substring filter (e.g. 'delete', 'update_role').",
    parameters: {
      type: OBJ,
      properties: {
        days: { type: NUM },
        action: { type: STR },
        limit: { type: NUM },
      },
    },
  },
  {
    name: "cancel_order",
    description:
      "DANGEROUS: Cancel an order (status → cancelled). First call returns dry_run instructions; execute ONLY with confirm:true after the admin explicitly approves in chat. Owner/admin only — staff cannot run this.",
    parameters: {
      type: OBJ,
      properties: {
        order_id: { type: STR, description: "Order UUID." },
        confirm: {
          type: BOOL,
          description: "Must be true to apply. Never true unless the admin clearly confirmed cancellation.",
        },
      },
      required: ["order_id"],
    },
  },
  {
    name: "update_product_stock",
    description:
      "DANGEROUS: Set product stock level. First call is dry_run unless confirm:true after explicit admin approval. Owner/admin only.",
    parameters: {
      type: OBJ,
      properties: {
        product_id: { type: STR },
        stock: { type: NUM },
        confirm: {
          type: BOOL,
          description: "Must be true to apply the stock update.",
        },
      },
      required: ["product_id", "stock"],
    },
  },
  {
    name: "update_order_status",
    description:
      "Update order status: pending → processing → shipped → delivered (or cancelled/refunded). Use order_id or order_number. Cancellation requires confirm:true. Owner/admin only.",
    parameters: {
      type: OBJ,
      properties: {
        order_id: { type: STR },
        order_number: { type: STR },
        status: {
          type: STR,
          description: "pending|processing|shipped|delivered|cancelled|refunded",
        },
        confirm: { type: BOOL, description: "Required true for cancelled." },
      },
      required: ["status"],
    },
  },
  {
    name: "create_discount",
    description:
      "Create a promo code. Auto-generates code if omitted. type=percent|fixed, value, expires_in_days (default 7). Owner/admin only.",
    parameters: {
      type: OBJ,
      properties: {
        code: { type: STR },
        type: { type: STR, description: "percent or fixed" },
        value: { type: NUM },
        expires_in_days: { type: NUM },
        max_uses: { type: NUM },
        min_order_amount_egp: { type: NUM },
        active: { type: BOOL },
      },
      required: ["value"],
    },
  },
] as unknown as FunctionDeclaration[];

export const TOOL_HANDLERS: Record<string, Handler> = {
  get_dashboard_summary,
  search_orders,
  get_order_details,
  search_products: list_products,
  search_customers,
  get_top_products,
  get_sales_report,
  list_discounts,
  list_recent_audit_logs,
  cancel_order,
  update_product_stock,
  update_order_status,
  create_discount,
  ...OPERATOR_TOOL_HANDLERS,
};

export type CopilotToolCall = {
  name: string;
  args: Record<string, unknown>;
  result: Json;
  ms: number;
};

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  actor: CopilotToolActor,
): Promise<CopilotToolCall> {
  const resolved = resolveToolName(name);
  const handler = TOOL_HANDLERS[resolved] ?? TOOL_HANDLERS[name];
  const start = Date.now();
  if (!handler) {
    return {
      name,
      args,
      result: { warning: `Unknown tool '${name}'.` },
      ms: 0,
    };
  }
  let result: Json;
  try {
    result = await handler(args ?? {}, actor);
  } catch (e) {
    result = { warning: e instanceof Error ? e.message : "tool failed" };
  }
  return { name: resolved, args: safe(args, {}), result, ms: Date.now() - start };
}
