import { BRAND } from "@/lib/brand";
import { ALL_SELLABLE } from "@/lib/data";
import type { UserRole } from "@/lib/admin/rbac";
import type { CartLine } from "@/lib/cart/types";
import { cartSubtotal } from "@/lib/cart/types";
import { fetchAdminAnalyticsSnapshot } from "@/lib/mr-brownie/analytics-snapshot";
import { buildMrBrowniePermissions } from "@/lib/mr-brownie/permissions-context";
import { buildMrBrownieResponsePlaybook } from "@/lib/mr-brownie/response-playbook";
import type { MrBrownieContextPayload } from "@/lib/mr-brownie/types";

function productsFromCatalog() {
  return ALL_SELLABLE.slice(0, 48).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description?.slice(0, 240) ?? "",
    price_egp: p.price,
    category: p.category,
  }));
}

function defaultOffers() {
  return [
    {
      code: `FREESHIP_${BRAND.freeDeliveryThresholdEgp}`,
      discount_summary: `Free delivery on orders over ${BRAND.freeDeliveryThresholdEgp} ${BRAND.currency}`,
      expiry: null,
      eligible_products: [] as string[],
    },
  ];
}

export async function buildMrBrownieContext(params: {
  role: UserRole | "guest";
  userId: string | null;
  email: string | null;
  name: string | null;
  loyaltyTier: string | null;
  pastOrdersHint: string;
  cartLines: CartLine[];
  includeAdminData: boolean;
}): Promise<MrBrownieContextPayload> {
  const subtotal = cartSubtotal(params.cartLines);
  const cart = {
    items: params.cartLines.map((l) => ({
      product_id: l.productId,
      name: l.name,
      quantity: l.quantity,
      line_total_egp: Math.round(l.priceEgp * l.quantity * 100) / 100,
    })),
    subtotal: Math.round(subtotal * 100) / 100,
    applied_promo: null,
  };

  const base: MrBrownieContextPayload = {
    user: {
      id: params.userId,
      role: params.role === "guest" ? "guest" : params.role,
      name: params.name,
      language: "auto",
      loyalty_tier: params.loyaltyTier ?? "standard",
      past_orders_summary: params.pastOrdersHint || "No recent order history in context.",
    },
    products: productsFromCatalog(),
    cart,
    offers: defaultOffers(),
    permissions: buildMrBrowniePermissions(params.role),
    response_playbook: buildMrBrownieResponsePlaybook(params.role),
  };

  if (!params.includeAdminData) {
    return base;
  }

  const snap = await fetchAdminAnalyticsSnapshot();
  base.analytics = {
    note: snap
      ? undefined
      : "Operational analytics incomplete — verify Supabase connection or migrations.",
    today: {
      sessions: null,
      orders: snap?.today_orders ?? 0,
      revenue_egp: Math.round((snap?.today_revenue_egp ?? 0) * 100) / 100,
      conversion_rate: null,
    },
    week: {
      sessions: null,
      orders: snap?.week_orders ?? 0,
      revenue_egp: Math.round((snap?.week_revenue_egp ?? 0) * 100) / 100,
      top_products: snap?.top_product_names_week ?? [],
    },
    alerts: [],
  };

  base.orders = {
    recent_summary: "Use analytics.today and analytics.week for aggregates.",
    pending_count: null,
    abandoned_hint: null,
  };

  return base;
}
