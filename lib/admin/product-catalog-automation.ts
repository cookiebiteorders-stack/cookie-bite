import type { SupabaseClient } from "@supabase/supabase-js";

export type ProductCatalogSettings = {
  id: string;
  low_stock_threshold: number;
  auto_deactivate_zero_stock: boolean;
  email_alerts_enabled: boolean;
  alert_recipient_email: string | null;
  alert_cooldown_hours: number;
  last_stock_alert_at: string | null;
  updated_at: string;
};

export const DEFAULT_CATALOG_SETTINGS: Omit<ProductCatalogSettings, "updated_at" | "last_stock_alert_at"> & {
  updated_at: string;
  last_stock_alert_at: string | null;
} = {
  id: "global",
  low_stock_threshold: 10,
  auto_deactivate_zero_stock: false,
  email_alerts_enabled: true,
  alert_recipient_email: null,
  alert_cooldown_hours: 24,
  last_stock_alert_at: null,
  updated_at: new Date(0).toISOString(),
};

export async function getProductCatalogSettings(
  supabase: SupabaseClient,
): Promise<ProductCatalogSettings> {
  const { data, error } = await supabase
    .from("product_catalog_settings")
    .select("*")
    .eq("id", "global")
    .maybeSingle();
  if (error || !data) return { ...DEFAULT_CATALOG_SETTINGS };
  return data as ProductCatalogSettings;
}

export async function updateProductCatalogSettings(
  supabase: SupabaseClient,
  patch: Partial<
    Pick<
      ProductCatalogSettings,
      | "low_stock_threshold"
      | "auto_deactivate_zero_stock"
      | "email_alerts_enabled"
      | "alert_recipient_email"
      | "alert_cooldown_hours"
    >
  >,
): Promise<ProductCatalogSettings> {
  const { data, error } = await supabase
    .from("product_catalog_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", "global")
    .select("*")
    .single();
  if (error) throw error;
  return data as ProductCatalogSettings;
}

export type ProductPerformanceRow = {
  product_id: string;
  views: number;
  add_to_cart: number;
  purchases: number;
  units_sold: number;
  conversion_rate: number;
};

export async function loadProductPerformance(
  supabase: SupabaseClient,
  opts: { days?: number; productIds?: string[]; limit?: number } = {},
): Promise<ProductPerformanceRow[]> {
  const days = opts.days ?? 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  let eventsQuery = supabase
    .from("user_events")
    .select("product_id, event_type")
    .gte("created_at", since);
  if (opts.productIds?.length) {
    eventsQuery = eventsQuery.in("product_id", opts.productIds);
  }
  const { data: events } = await eventsQuery.limit(50_000);

  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id, status, created_at")
    .gte("created_at", since)
    .neq("status", "cancelled")
    .limit(5000);

  const orderIds = (recentOrders ?? []).map((o) => String(o.id));
  let salesRows: Array<{ product_id: string; quantity: number }> = [];
  if (orderIds.length > 0) {
    const chunkSize = 200;
    for (let i = 0; i < orderIds.length; i += chunkSize) {
      const chunk = orderIds.slice(i, i + chunkSize);
      let q = supabase.from("order_items").select("product_id, quantity").in("order_id", chunk);
      if (opts.productIds?.length) q = q.in("product_id", opts.productIds);
      const { data } = await q;
      salesRows = salesRows.concat((data ?? []) as Array<{ product_id: string; quantity: number }>);
    }
  }

  const map = new Map<string, ProductPerformanceRow>();

  const ensure = (productId: string) => {
    let row = map.get(productId);
    if (!row) {
      row = {
        product_id: productId,
        views: 0,
        add_to_cart: 0,
        purchases: 0,
        units_sold: 0,
        conversion_rate: 0,
      };
      map.set(productId, row);
    }
    return row;
  };

  for (const ev of events ?? []) {
    const row = ensure(String(ev.product_id));
    if (ev.event_type === "view") row.views += 1;
    if (ev.event_type === "add_to_cart") row.add_to_cart += 1;
    if (ev.event_type === "purchase") row.purchases += 1;
  }

  for (const item of salesRows) {
    const row = ensure(String(item.product_id));
    row.units_sold += Number(item.quantity ?? 0);
    row.purchases = Math.max(row.purchases, row.units_sold > 0 ? 1 : row.purchases);
  }

  const rows = [...map.values()].map((row) => ({
    ...row,
    conversion_rate: row.views > 0 ? Math.round((row.purchases / row.views) * 10_000) / 100 : 0,
  }));

  rows.sort((a, b) => b.views - a.views || b.units_sold - a.units_sold);
  return rows.slice(0, opts.limit ?? 50);
}

export async function publishScheduledProducts(supabase: SupabaseClient): Promise<number> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("products")
    .select("id")
    .eq("is_active", false)
    .not("publish_at", "is", null)
    .lte("publish_at", now);

  const ids = (data ?? []).map((r) => String(r.id));
  if (ids.length === 0) return 0;

  await supabase.from("products").update({ is_active: true }).in("id", ids);
  return ids.length;
}

export async function clearExpiredProductDiscounts(supabase: SupabaseClient): Promise<number> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("products")
    .update({ compare_price_egp: null, discount_ends_at: null })
    .not("discount_ends_at", "is", null)
    .lte("discount_ends_at", now)
    .select("id");
  return data?.length ?? 0;
}

export async function runProductStockRules(
  supabase: SupabaseClient,
  settings: ProductCatalogSettings,
): Promise<{ deactivated: number; low_stock_count: number }> {
  let deactivated = 0;

  if (settings.auto_deactivate_zero_stock) {
    const { data } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("is_active", true)
      .lte("stock", 0)
      .select("id");
    deactivated = data?.length ?? 0;
  }

  const threshold = settings.low_stock_threshold;
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .gt("stock", 0)
    .lte("stock", threshold);

  return { deactivated, low_stock_count: count ?? 0 };
}

export async function markStockAlertSent(supabase: SupabaseClient): Promise<void> {
  await supabase
    .from("product_catalog_settings")
    .update({ last_stock_alert_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", "global");
}

export function canSendStockAlert(settings: ProductCatalogSettings): boolean {
  if (!settings.email_alerts_enabled) return false;
  if (!settings.last_stock_alert_at) return true;
  const last = new Date(settings.last_stock_alert_at).getTime();
  const cooldownMs = settings.alert_cooldown_hours * 3_600_000;
  return Date.now() - last >= cooldownMs;
}
