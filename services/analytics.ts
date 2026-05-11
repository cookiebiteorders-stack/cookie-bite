import type { SupabaseClient } from "@supabase/supabase-js";

type QueryErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export type AnalyticsRangePreset = "7d" | "30d" | "90d" | "custom";
export type CustomerSegmentFilter = "all" | "registered" | "guest";

export type AnalyticsFilters = {
  range: AnalyticsRangePreset;
  from?: string | null;
  to?: string | null;
  product?: string | null;
  category?: string | null;
  segment?: CustomerSegmentFilter | null;
};

export type RevenuePoint = { date: string; revenue: number };
export type OrdersPoint = { date: string; orders: number };
export type CustomerGrowthPoint = { date: string; customers: number };
export type TopProductPoint = { name: string; sales: number; revenue: number };

export type AnalyticsKpiCard = {
  title: string;
  value: number;
  deltaPct: number;
  trend: number[];
};

export type AnalyticsInsights = {
  revenueDeltaText: string;
  topProductText: string;
  activeDayText: string;
};

export type AnalyticsDashboardData = {
  filters: {
    from: string;
    to: string;
    range: AnalyticsRangePreset;
    product: string | null;
    category: string | null;
    segment: CustomerSegmentFilter;
  };
  kpis: {
    revenue: AnalyticsKpiCard;
    orders: AnalyticsKpiCard;
    customers: AnalyticsKpiCard;
    conversionRate: AnalyticsKpiCard;
  };
  charts: {
    revenueOverTime: RevenuePoint[];
    ordersByDay: OrdersPoint[];
    topProducts: TopProductPoint[];
    customerGrowth: CustomerGrowthPoint[];
  };
  insights: AnalyticsInsights;
  meta: {
    source: "payments" | "orders_fallback";
    fetchedAt: string;
    cacheHit: boolean;
    debug: Record<string, unknown>;
  };
};

type OrderLite = {
  id: string;
  total_egp: number;
  payment_status: string | null;
  status: string | null;
  created_at: string;
  user_id: string | null;
};

type PaymentLite = {
  id: string;
  amount: number;
  status: string | null;
  created_at: string;
  order_id?: string | null;
};

type OrderItemLite = {
  order_id: string | null;
  product_name: string | null;
  quantity: number;
  total_price_egp: number | null;
  created_at?: string | null;
  product_id?: string | null;
};

type UserLite = {
  id: string;
  role: string | null;
  created_at: string | null;
};

const CACHE_TTL_MS = 45_000;
const analyticsCache = new Map<string, { expiresAt: number; data: AnalyticsDashboardData }>();

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v: string): Date | null {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDayIso(d: Date): string {
  const c = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  return c.toISOString();
}

function endOfDayIso(d: Date): string {
  const c = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  return c.toISOString();
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function rangeFromPreset(range: AnalyticsRangePreset): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  const days = range === "7d" ? 6 : range === "30d" ? 29 : 89;
  from.setUTCDate(from.getUTCDate() - days);
  return { from, to };
}

function normalizeFilters(filters: AnalyticsFilters) {
  const fallback = rangeFromPreset(filters.range);
  const customFrom = filters.from ? parseDate(filters.from) : null;
  const customTo = filters.to ? parseDate(filters.to) : null;
  const from = filters.range === "custom" && customFrom ? customFrom : fallback.from;
  const to = filters.range === "custom" && customTo ? customTo : fallback.to;
  return {
    range: filters.range,
    fromIso: startOfDayIso(from),
    toIso: endOfDayIso(to),
    product: filters.product?.trim() || null,
    category: filters.category?.trim() || null,
    segment: filters.segment ?? "all",
  };
}

function buildDailySeries(fromIso: string, toIso: string) {
  const from = parseDate(fromIso);
  const to = parseDate(toIso);
  if (!from || !to) return [];
  const out: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    out.push(dayKey(cursor.toISOString()));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function percentChange(current: number, previous: number): number {
  if (previous <= 0 && current > 0) return 100;
  if (previous <= 0) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function compactTrend(values: number[], size = 12): number[] {
  if (values.length <= size) return values;
  const step = values.length / size;
  const out: number[] = [];
  for (let i = 0; i < size; i += 1) {
    out.push(values[Math.min(values.length - 1, Math.floor(i * step))] ?? 0);
  }
  return out;
}

async function selectWithFallback<T>(
  queryAttempts: Array<() => Promise<{ data: T[] | null; error: QueryErrorLike | null }>>,
): Promise<{ data: T[]; error: QueryErrorLike | null; attempt: number }> {
  let lastError: QueryErrorLike | null = null;
  for (let idx = 0; idx < queryAttempts.length; idx += 1) {
    const result = await queryAttempts[idx]();
    if (!result.error) return { data: result.data ?? [], error: null, attempt: idx + 1 };
    lastError = result.error;
  }
  return { data: [], error: lastError, attempt: queryAttempts.length };
}

export async function getRevenue(
  supabase: SupabaseClient,
  opts: { fromIso: string; toIso: string; orderIds?: Set<string> },
): Promise<{ points: RevenuePoint[]; source: "payments" | "orders_fallback"; debug: Record<string, unknown> }> {
  const daily = new Map<string, number>();
  const debug: Record<string, unknown> = {};

  const paymentQuery = await selectWithFallback<PaymentLite>([
    async () =>
      await supabase
        .from("payments")
        .select("id,amount,status,created_at,order_id")
        .gte("created_at", opts.fromIso)
        .lte("created_at", opts.toIso),
    async () =>
      await supabase
        .from("payments")
        .select("id,amount,status,created_at")
        .gte("created_at", opts.fromIso)
        .lte("created_at", opts.toIso),
  ]);

  if (!paymentQuery.error) {
    for (const row of paymentQuery.data) {
      const status = (row.status ?? "").toLowerCase();
      if (status !== "paid") continue;
      if (opts.orderIds && row.order_id && !opts.orderIds.has(row.order_id)) continue;
      const key = dayKey(row.created_at);
      daily.set(key, (daily.get(key) ?? 0) + toNum(row.amount));
    }
    debug.revenueQueryAttempt = paymentQuery.attempt;
    return {
      points: buildDailySeries(opts.fromIso, opts.toIso).map((date) => ({
        date,
        revenue: Number((daily.get(date) ?? 0).toFixed(2)),
      })),
      source: "payments",
      debug,
    };
  }

  const fallback = await supabase
    .from("orders")
    .select("id,total_egp,payment_status,created_at")
    .gte("created_at", opts.fromIso)
    .lte("created_at", opts.toIso);

  if (fallback.error) {
    throw new Error(`Revenue query failed: ${fallback.error.message}`);
  }

  for (const row of (fallback.data as OrderLite[]) ?? []) {
    const status = (row.payment_status ?? "").toLowerCase();
    if (status !== "paid") continue;
    if (opts.orderIds && !opts.orderIds.has(row.id)) continue;
    const key = dayKey(row.created_at);
    daily.set(key, (daily.get(key) ?? 0) + toNum(row.total_egp));
  }
  debug.revenueFallback = "orders.total_egp where payment_status=paid";
  debug.revenueError = paymentQuery.error?.message ?? null;

  return {
    points: buildDailySeries(opts.fromIso, opts.toIso).map((date) => ({
      date,
      revenue: Number((daily.get(date) ?? 0).toFixed(2)),
    })),
    source: "orders_fallback",
    debug,
  };
}

export async function getOrders(
  supabase: SupabaseClient,
  opts: { fromIso: string; toIso: string; segment: CustomerSegmentFilter; orderIds?: Set<string> },
): Promise<{ points: OrdersPoint[]; rows: OrderLite[] }> {
  let q = supabase
    .from("orders")
    .select("id,total_egp,payment_status,status,created_at,user_id")
    .gte("created_at", opts.fromIso)
    .lte("created_at", opts.toIso)
    .order("created_at", { ascending: true })
    .limit(10000);

  if (opts.segment === "guest") q = q.is("user_id", null);
  if (opts.segment === "registered") q = q.not("user_id", "is", null);

  const { data, error } = await q;
  if (error) throw new Error(`Orders query failed: ${error.message}`);

  const rows = ((data as unknown) as OrderLite[]) ?? [];
  const filteredRows = opts.orderIds ? rows.filter((row) => opts.orderIds!.has(row.id)) : rows;
  const map = new Map<string, number>();
  for (const row of filteredRows) {
    const key = dayKey(row.created_at);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const points = buildDailySeries(opts.fromIso, opts.toIso).map((date) => ({
    date,
    orders: map.get(date) ?? 0,
  }));
  return { points, rows: filteredRows };
}

export async function getCustomers(
  supabase: SupabaseClient,
  opts: { fromIso: string; toIso: string },
): Promise<{ total: number; growth: CustomerGrowthPoint[] }> {
  const { data, error } = await supabase
    .from("users")
    .select("id,role,created_at")
    .eq("role", "customer")
    .order("created_at", { ascending: true })
    .limit(20000);

  if (error) throw new Error(`Customers query failed: ${error.message}`);
  const rows = ((data as unknown) as UserLite[]) ?? [];
  const growthMap = new Map<string, number>();
  for (const row of rows) {
    if (!row.created_at) continue;
    const key = dayKey(row.created_at);
    growthMap.set(key, (growthMap.get(key) ?? 0) + 1);
  }

  let running = 0;
  const growth = buildDailySeries(opts.fromIso, opts.toIso).map((date) => {
    running += growthMap.get(date) ?? 0;
    return { date, customers: running };
  });

  return { total: rows.length, growth };
}

export async function getTopProducts(
  supabase: SupabaseClient,
  opts: { fromIso: string; toIso: string; product?: string | null; category?: string | null },
): Promise<{ top: TopProductPoint[]; matchedOrderIds: Set<string> }> {
  const attempt = await selectWithFallback<OrderItemLite>([
    async () =>
      await supabase
        .from("order_items")
        .select("order_id,product_name,quantity,total_price_egp,created_at,product_id")
        .gte("created_at", opts.fromIso)
        .lte("created_at", opts.toIso)
        .limit(15000),
    async () =>
      await supabase
        .from("order_items")
        .select("order_id,product_name,quantity,total_price_egp,product_id")
        .limit(15000),
    async () =>
      await supabase
        .from("order_items")
        .select("order_id,product_name,quantity,total_price_egp")
        .limit(15000),
  ]);

  if (attempt.error) throw new Error(`Top products query failed: ${attempt.error.message}`);
  const items = attempt.data ?? [];

  const productMap = new Map<string, { sales: number; revenue: number; orderIds: Set<string> }>();
  for (const item of items) {
    const name = (item.product_name ?? "Unknown product").trim();
    if (opts.product && !name.toLowerCase().includes(opts.product.toLowerCase())) continue;
    if (opts.category && !name.toLowerCase().includes(opts.category.toLowerCase())) continue;
    const rec = productMap.get(name) ?? { sales: 0, revenue: 0, orderIds: new Set<string>() };
    rec.sales += Math.max(0, toNum(item.quantity));
    rec.revenue += Math.max(0, toNum(item.total_price_egp));
    if (item.order_id) rec.orderIds.add(item.order_id);
    productMap.set(name, rec);
  }

  const top = [...productMap.entries()]
    .map(([name, v]) => ({
      name,
      sales: v.sales,
      revenue: Number(v.revenue.toFixed(2)),
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 8);

  const matchedOrderIds = new Set<string>();
  for (const value of productMap.values()) {
    for (const id of value.orderIds) matchedOrderIds.add(id);
  }

  return { top, matchedOrderIds };
}

export async function getAnalyticsDashboard(
  supabase: SupabaseClient,
  input: AnalyticsFilters,
): Promise<AnalyticsDashboardData> {
  const normalized = normalizeFilters(input);
  const cacheKey = JSON.stringify(normalized);
  const now = Date.now();
  const cached = analyticsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return {
      ...cached.data,
      meta: {
        ...cached.data.meta,
        cacheHit: true,
        fetchedAt: new Date().toISOString(),
      },
    };
  }

  const debug: Record<string, unknown> = {
    filters: normalized,
  };

  const topProductsResult = await getTopProducts(supabase, {
    fromIso: normalized.fromIso,
    toIso: normalized.toIso,
    product: normalized.product,
    category: normalized.category,
  });

  const scopedOrderIds =
    normalized.product || normalized.category ? topProductsResult.matchedOrderIds : undefined;

  const [ordersResult, customersResult, revenueResult] = await Promise.all([
    getOrders(supabase, {
      fromIso: normalized.fromIso,
      toIso: normalized.toIso,
      segment: normalized.segment,
      orderIds: scopedOrderIds,
    }),
    getCustomers(supabase, {
      fromIso: normalized.fromIso,
      toIso: normalized.toIso,
    }),
    getRevenue(supabase, {
      fromIso: normalized.fromIso,
      toIso: normalized.toIso,
      orderIds: scopedOrderIds,
    }),
  ]);

  const currentRevenue = revenueResult.points.reduce((acc, row) => acc + row.revenue, 0);
  const currentOrders = ordersResult.points.reduce((acc, row) => acc + row.orders, 0);
  const paidOrders = ordersResult.rows.filter((row) => (row.payment_status ?? "").toLowerCase() === "paid").length;
  const conversionRate = currentOrders > 0 ? (paidOrders / currentOrders) * 100 : 0;

  const prevFrom = parseDate(normalized.fromIso);
  const prevTo = parseDate(normalized.toIso);
  let prevRevenue = 0;
  let prevOrders = 0;
  let prevCustomers = 0;
  let prevConversion = 0;
  if (prevFrom && prevTo) {
    const spanMs = prevTo.getTime() - prevFrom.getTime() + 1;
    const oldTo = new Date(prevFrom.getTime() - 1);
    const oldFrom = new Date(oldTo.getTime() - spanMs);
    const oldTop = await getTopProducts(supabase, {
      fromIso: oldFrom.toISOString(),
      toIso: oldTo.toISOString(),
      product: normalized.product,
      category: normalized.category,
    });
    const oldScope = normalized.product || normalized.category ? oldTop.matchedOrderIds : undefined;
    const [oldOrders, oldCustomers, oldRevenue] = await Promise.all([
      getOrders(supabase, {
        fromIso: oldFrom.toISOString(),
        toIso: oldTo.toISOString(),
        segment: normalized.segment,
        orderIds: oldScope,
      }),
      getCustomers(supabase, {
        fromIso: oldFrom.toISOString(),
        toIso: oldTo.toISOString(),
      }),
      getRevenue(supabase, {
        fromIso: oldFrom.toISOString(),
        toIso: oldTo.toISOString(),
        orderIds: oldScope,
      }),
    ]);
    prevRevenue = oldRevenue.points.reduce((acc, row) => acc + row.revenue, 0);
    prevOrders = oldOrders.points.reduce((acc, row) => acc + row.orders, 0);
    prevCustomers = oldCustomers.total;
    const oldPaid = oldOrders.rows.filter((row) => (row.payment_status ?? "").toLowerCase() === "paid").length;
    prevConversion = prevOrders > 0 ? (oldPaid / prevOrders) * 100 : 0;
  }

  const revenueTrend = compactTrend(revenueResult.points.map((r) => r.revenue));
  const ordersTrend = compactTrend(ordersResult.points.map((r) => r.orders));
  const customerTrend = compactTrend(customersResult.growth.map((g) => g.customers));
  const conversionTrend = compactTrend(
    ordersResult.points.map((point) => {
      const day = point.date;
      const dayRows = ordersResult.rows.filter((row) => dayKey(row.created_at) === day);
      const dayPaid = dayRows.filter((row) => (row.payment_status ?? "").toLowerCase() === "paid").length;
      return dayRows.length ? (dayPaid / dayRows.length) * 100 : 0;
    }),
  );

  const mostActive = ordersResult.points.reduce(
    (best, point) => (point.orders > best.orders ? point : best),
    { date: "", orders: -1 },
  );
  const topProductName = topProductsResult.top[0]?.name ?? "No product yet";

  const result: AnalyticsDashboardData = {
    filters: {
      from: normalized.fromIso,
      to: normalized.toIso,
      range: normalized.range,
      product: normalized.product,
      category: normalized.category,
      segment: normalized.segment,
    },
    kpis: {
      revenue: {
        title: "Revenue",
        value: Number(currentRevenue.toFixed(2)),
        deltaPct: percentChange(currentRevenue, prevRevenue),
        trend: revenueTrend,
      },
      orders: {
        title: "Orders Count",
        value: currentOrders,
        deltaPct: percentChange(currentOrders, prevOrders),
        trend: ordersTrend,
      },
      customers: {
        title: "Customers",
        value: customersResult.total,
        deltaPct: percentChange(customersResult.total, prevCustomers),
        trend: customerTrend,
      },
      conversionRate: {
        title: "Conversion Rate",
        value: Number(conversionRate.toFixed(2)),
        deltaPct: percentChange(conversionRate, prevConversion),
        trend: conversionTrend,
      },
    },
    charts: {
      revenueOverTime: revenueResult.points,
      ordersByDay: ordersResult.points,
      topProducts: topProductsResult.top,
      customerGrowth: customersResult.growth,
    },
    insights: {
      revenueDeltaText:
        revenueResult.points.length > 0
          ? `Revenue ${percentChange(currentRevenue, prevRevenue) >= 0 ? "increased" : "decreased"} ${Math.abs(percentChange(currentRevenue, prevRevenue))}% compared to previous period.`
          : "Revenue trend is not available yet.",
      topProductText: `Top product: ${topProductName}.`,
      activeDayText:
        mostActive.orders > 0
          ? `Most active day: ${mostActive.date} (${mostActive.orders} orders).`
          : "No active order day yet.",
    },
    meta: {
      source: revenueResult.source,
      fetchedAt: new Date().toISOString(),
      cacheHit: false,
      debug: {
        ...debug,
        ...revenueResult.debug,
        scopedOrderIds: scopedOrderIds ? scopedOrderIds.size : "all",
      },
    },
  };

  analyticsCache.set(cacheKey, {
    data: result,
    expiresAt: now + CACHE_TTL_MS,
  });

  return result;
}
