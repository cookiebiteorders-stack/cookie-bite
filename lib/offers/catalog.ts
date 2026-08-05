import { listAddonCategoriesWithItems } from "@/lib/db/addon-categories";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeOfferPricing, isOfferCurrentlyValid } from "@/lib/offers/pricing";
import type {
  BundleOfferRow,
  EnrichedBundleOffer,
  OfferAddonItem,
  OfferCatalogAddonOption,
  OfferCatalogProduct,
} from "@/lib/offers/types";

export async function loadOfferCatalog() {
  const supabase = createSupabaseAdminClient();
  // Optimized: Select only required fields instead of *
  const PRODUCT_SELECT = "id, slug, title_en, title_ar, name, description_en, description_ar, price_egp, compare_price_egp, sku, category, stock, is_active, images, badges, dietary";
  const [{ data: products, error: productsError }, categories] = await Promise.all([
    supabase.from("products").select(PRODUCT_SELECT).order("title_en", { ascending: true }),
    listAddonCategoriesWithItems(),
  ]);

  if (productsError) {
    throw new Error(productsError.message);
  }

  const catalogProducts: OfferCatalogProduct[] = (products ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    title_en: p.title_en,
    title_ar: p.title_ar,
    name: p.name,
    description_en: p.description_en,
    description_ar: p.description_ar,
    price_egp: Number(p.price_egp),
    compare_price_egp: p.compare_price_egp != null ? Number(p.compare_price_egp) : null,
    sku: p.sku,
    category: p.category,
    stock: Number(p.stock ?? 0),
    is_active: Boolean(p.is_active),
    images: Array.isArray(p.images) ? p.images : [],
    badges: p.badges,
    dietary: Array.isArray(p.dietary) ? p.dietary : [],
  }));

  const catalogAddons: OfferCatalogAddonOption[] = categories.flatMap((category) => {
    if (!category.items || category.items.length === 0) return [];
    return category.items.map((option) => ({
      addon_id: category.addon_id ?? category.id,
      addon_name: category.name,
      category_name: category.name,
      option_id: option.id,
      option_name: option.name,
      price: Number(option.price ?? 0),
      stock: option.stock ?? null,
      weight_grams: option.weight_grams ?? null,
      selection_type: category.selection_type,
      required: category.required,
    }));
  });

  return { products: catalogProducts, addons: catalogAddons };
}

export function enrichBundleOffer(
  offer: BundleOfferRow,
  catalog: { products: OfferCatalogProduct[]; addons: OfferCatalogAddonOption[] },
): EnrichedBundleOffer {
  const addonItems = normalizeAddonItems(offer.addon_items);
  const products = offer.product_ids
    .map((id) => catalog.products.find((p) => p.id === id))
    .filter(Boolean) as OfferCatalogProduct[];
  const addons = addonItems
    .map((item) =>
      catalog.addons.find((a) => a.addon_id === item.addon_id && a.option_id === item.option_id),
    )
    .filter(Boolean) as OfferCatalogAddonOption[];

  const pricing = computeOfferPricing({
    productIds: offer.product_ids,
    addonItems,
    offerPriceEgp: Number(offer.offer_price_egp),
    products: catalog.products,
    addonOptions: catalog.addons,
  });

  return {
    ...offer,
    product_ids: offer.product_ids,
    addon_items: addonItems,
    offer_price_egp: Number(offer.offer_price_egp),
    original_total_egp: Number(offer.original_total_egp),
    avg_price_per_product_egp:
      offer.avg_price_per_product_egp != null
        ? Number(offer.avg_price_per_product_egp)
        : pricing.avg_price_per_product_egp,
    savings_egp: pricing.savings_egp,
    is_currently_valid: isOfferCurrentlyValid(offer),
    products,
    addons,
  };
}

export function normalizeAddonItems(raw: unknown): OfferAddonItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.addon_id !== "string" || typeof row.option_id !== "string") return null;
      return { addon_id: row.addon_id, option_id: row.option_id };
    })
    .filter(Boolean) as OfferAddonItem[];
}

export async function loadActiveOffers() {
  const supabase = createSupabaseAdminClient();
  const catalog = await loadOfferCatalog();
  const { data, error } = await supabase
    .from("bundle_offers")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => enrichBundleOffer(mapBundleOfferRow(row as Record<string, unknown>), catalog))
    .filter((offer) => offer.is_currently_valid && offer.products.length + offer.addons.length >= 2);
}

export function mapBundleOfferRow(row: Record<string, unknown>): BundleOfferRow {
  return {
    id: String(row.id),
    name_en: String(row.name_en ?? ""),
    name_ar: String(row.name_ar ?? ""),
    product_ids: Array.isArray(row.product_ids) ? row.product_ids.map(String) : [],
    addon_items: normalizeAddonItems(row.addon_items),
    offer_price_egp: Number(row.offer_price_egp),
    original_total_egp: Number(row.original_total_egp ?? 0),
    avg_price_per_product_egp:
      row.avg_price_per_product_egp != null ? Number(row.avg_price_per_product_egp) : null,
    starts_at: String(row.starts_at),
    ends_at: row.ends_at ? String(row.ends_at) : null,
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    created_by: row.created_by ? String(row.created_by) : null,
  };
}
