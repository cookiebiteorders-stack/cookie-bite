import { BRAND } from "@/lib/brand";
import { NAV_LINKS, OUR_COOKIE_SECTION_DEFS, SITE } from "@/lib/data";
import type { ProductRow } from "@/lib/db/types";
import { siteConfig } from "@/lib/site-config";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

/** TTL قصير — يبقي الكتالوج محدثاً دون ضغط على كل رسالة */
const CACHE_TTL_MS = 120_000;
const MAX_PRODUCTS_IN_CONTEXT = 64;

export type AiCatalogProduct = {
  id: string;
  product_uuid: string;
  name: string;
  name_ar: string | null;
  description: string;
  price_egp: number;
  compare_price_egp: number | null;
  category: string;
  badges: string[];
  stock: number;
  in_stock: boolean;
  dietary: string[];
  pieces_count: number | null;
  shop_path: string;
  image_url: string | null;
};

export type WebsiteKnowledgeSnapshot = {
  generated_at: string;
  store: { name: string; tagline: string; location: string; currency: string };
  contact: { phone: string; whatsapp: string; email: string };
  delivery: {
    free_threshold_egp: number;
    standard_fee_egp: number;
    note: string;
  };
  pages: Array<{ path: string; label: string; purpose: string }>;
  features: string[];
  cookie_sections: Array<{ id: string; category: string }>;
  categories: string[];
};

export type LiveCatalogSnapshot = {
  products: AiCatalogProduct[];
  total_active: number;
  truncated: boolean;
  source: "supabase" | "unavailable";
  note?: string;
};

export type AiPromoOffer = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order_amount_egp: number;
  discount_summary: string;
  expiry: string | null;
  eligible_products: string[];
};

type CachedBundle = {
  expiresAt: number;
  catalog: LiveCatalogSnapshot;
  website: WebsiteKnowledgeSnapshot;
  promoOffers: AiPromoOffer[];
};

let cache: CachedBundle | null = null;

function buildStaticWebsiteSnapshot(categories: string[]): WebsiteKnowledgeSnapshot {
  const extraPages: WebsiteKnowledgeSnapshot["pages"] = [
    { path: "/shop", label: "Shop", purpose: "Browse all active products and filters" },
    { path: "/shop/[slug]", label: "Product", purpose: "Product detail, add to cart" },
    { path: "/gift-box", label: "Gift boxes", purpose: "Curated gift box landing" },
    { path: "/gift-box/build", label: "Gift box builder", purpose: "Build custom gift box from catalog items" },
    { path: "/our-cookies", label: "Our cookies", purpose: "Collections by flavor category" },
    { path: "/mystery-box", label: "Mystery box", purpose: "Surprise cookie box experience" },
    { path: "/cart", label: "Cart", purpose: "Review cart before checkout" },
    { path: "/checkout", label: "Checkout", purpose: "Paymob payment and delivery details" },
    { path: "/account", label: "Account", purpose: "Orders, loyalty, profile (signed-in)" },
    { path: "/help", label: "Help center", purpose: "FAQ, delivery, returns, allergens" },
    { path: "/search", label: "Search", purpose: "Find products by keyword" },
    { path: "/corporate-gifting", label: "Corporate gifting", purpose: "Bulk / corporate orders" },
    { path: "/gift-ideas", label: "Gift ideas", purpose: "Occasion-based gifting inspiration" },
    { path: "/blog", label: "Blog", purpose: "Brand stories and updates" },
  ];

  const fromNav = NAV_LINKS.map((n) => ({
    path: n.href,
    label: n.label,
    purpose: "Primary navigation",
  }));

  const pages = [...fromNav];
  for (const p of extraPages) {
    if (!pages.some((x) => x.path === p.path)) pages.push(p);
  }

  return {
    generated_at: new Date().toISOString(),
    store: {
      name: SITE.name,
      tagline: SITE.tagline,
      location: BRAND.location,
      currency: BRAND.currency,
    },
    contact: {
      phone: BRAND.phoneDisplay,
      whatsapp: BRAND.whatsappE164,
      email: BRAND.email,
    },
    delivery: {
      free_threshold_egp: siteConfig.freeDeliveryThresholdEgp,
      standard_fee_egp: siteConfig.standardDeliveryFeeEgp,
      note: `Free delivery on orders over ${siteConfig.freeDeliveryThresholdEgp} ${BRAND.currency} (New Cairo area). Fresh baked to order; typical lead time shared at checkout.`,
    },
    pages,
    features: [
      "Live product catalog from database (not static demo data)",
      "Custom gift box builder at /gift-box/build",
      "Mystery box at /mystery-box",
      "Promo codes at checkout",
      "Loyalty program for signed-in customers",
      "WhatsApp support",
      "Bilingual Arabic/English storefront",
    ],
    cookie_sections: OUR_COOKIE_SECTION_DEFS.map((s) => ({
      id: s.id,
      category: s.shopCategory,
    })),
    categories: categories.length ? categories : OUR_COOKIE_SECTION_DEFS.map((s) => s.shopCategory),
  };
}

function productRowToAiCatalog(row: ProductRow): AiCatalogProduct {
  const name =
    row.title_en?.trim() || row.title_ar?.trim() || row.name?.trim() || row.slug;
  const description = (
    row.description_en ||
    row.description_ar ||
    row.description ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
  const slug = row.slug?.trim() || row.id;

  return {
    id: slug,
    product_uuid: row.id,
    name,
    name_ar: row.title_ar?.trim() || null,
    description,
    price_egp: Number(row.price_egp) || 0,
    compare_price_egp:
      row.compare_price_egp != null ? Number(row.compare_price_egp) : null,
    category: row.category?.trim() || "General",
    badges: Array.isArray(row.badges) ? row.badges.filter(Boolean) : [],
    stock: typeof row.stock === "number" ? row.stock : 0,
    in_stock: (typeof row.stock === "number" ? row.stock : 0) > 0,
    dietary: Array.isArray(row.dietary) ? row.dietary : [],
    pieces_count: row.pieces_count ?? null,
    shop_path: `/shop/${slug}`,
    image_url: row.image_url?.trim() || null,
  };
}

async function fetchLiveCatalog(): Promise<LiveCatalogSnapshot> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    return {
      products: [],
      total_active: 0,
      truncated: false,
      source: "unavailable",
      note:
        "Database client unavailable. Do NOT tell the user the store has no products — suggest opening /shop or contacting support.",
    };
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, title_en, title_ar, description, description_en, description_ar, price_egp, compare_price_egp, image_url, category, badges, stock, dietary, pieces_count",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[website-knowledge] products query failed:", error);
    return {
      products: [],
      total_active: 0,
      truncated: false,
      source: "unavailable",
      note: "Catalog query failed. Direct the user to /shop; do not claim zero products.",
    };
  }

  const rows = (data as ProductRow[]) ?? [];
  const mapped = rows.map(productRowToAiCatalog);
  const total = mapped.length;

  return {
    products: mapped.slice(0, MAX_PRODUCTS_IN_CONTEXT),
    total_active: total,
    truncated: total > MAX_PRODUCTS_IN_CONTEXT,
    source: "supabase",
    note:
      total === 0
        ? "No active products returned from DB — still do not insist the business is closed; suggest /shop refresh."
        : undefined,
  };
}

async function fetchActivePromos(): Promise<AiPromoOffer[]> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return [];

  const nowMs = Date.now();
  const { data, error } = await supabase
    .from("promo_codes")
    .select(
      "code, type, value, min_order_amount_egp, valid_from, valid_until, is_active",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    console.error("[website-knowledge] promos query failed:", error);
    return [];
  }

  const offers: AiPromoOffer[] = [];
  for (const row of data ?? []) {
    const validFrom = row.valid_from ? new Date(String(row.valid_from)).getTime() : 0;
    const validUntil = row.valid_until
      ? new Date(String(row.valid_until)).getTime()
      : null;
    if (validFrom > nowMs) continue;
    if (validUntil != null && validUntil < nowMs) continue;
    const code = String(row.code ?? "").trim();
    if (!code) continue;
    const type = row.type === "percent" ? "percent" : "fixed";
    const value = Number(row.value) || 0;
    const min = Number(row.min_order_amount_egp) || 0;
    const summary =
      type === "percent"
        ? `${value}% off orders from ${min} ${BRAND.currency}`
        : `${value} ${BRAND.currency} off orders from ${min} ${BRAND.currency}`;
    offers.push({
      code,
      type,
      value,
      min_order_amount_egp: min,
      discount_summary: summary,
      expiry: row.valid_until ? String(row.valid_until) : null,
      eligible_products: [],
    });
  }
  return offers;
}

function defaultShippingOffer(): AiPromoOffer {
  const threshold = siteConfig.freeDeliveryThresholdEgp;
  return {
    code: `FREESHIP_${threshold}`,
    type: "fixed",
    value: siteConfig.standardDeliveryFeeEgp,
    min_order_amount_egp: threshold,
    discount_summary: `Free delivery on orders over ${threshold} ${BRAND.currency}`,
    expiry: null,
    eligible_products: [],
  };
}

/**
 * حزمة معرفة الموقع للذكاء الاصطناعي — كتالوج حي + صفحات + عروض.
 * تُخزَّن مؤقتاً لدقائق قليلة لتقليل الحمل مع بقاء البيانات حديثة.
 */
export async function loadAiWebsiteKnowledgeBundle(): Promise<{
  catalog: LiveCatalogSnapshot;
  website: WebsiteKnowledgeSnapshot;
  promoOffers: AiPromoOffer[];
}> {
  if (cache && Date.now() < cache.expiresAt) {
    return {
      catalog: cache.catalog,
      website: cache.website,
      promoOffers: cache.promoOffers,
    };
  }

  const catalog = await fetchLiveCatalog();
  const categories = [
    ...new Set(catalog.products.map((p) => p.category).filter(Boolean)),
  ].sort();
  const website = buildStaticWebsiteSnapshot(categories);
  const dbPromos = await fetchActivePromos();
  const promoOffers = [defaultShippingOffer(), ...dbPromos];

  cache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    catalog,
    website,
    promoOffers,
  };

  return { catalog, website, promoOffers };
}

/** أسماء منتجات للرسائل الاستباقية (FAB / fallback) */
export async function getAiProductNamePool(limit = 12): Promise<string[]> {
  const { catalog } = await loadAiWebsiteKnowledgeBundle();
  const names = catalog.products
    .map((p) => p.name.trim())
    .filter((n) => n.length > 0);
  if (names.length > 0) return names.slice(0, limit);
  if (catalog.total_active > 0) {
    return [`${catalog.total_active} items in catalog — see /shop`];
  }
  return [];
}

/** إبطال الذاكرة المؤقتة بعد تعديل منتج (اختياري من مسارات الإدارة لاحقاً) */
export function invalidateAiWebsiteKnowledgeCache(): void {
  cache = null;
}
