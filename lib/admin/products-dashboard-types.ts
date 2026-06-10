import { MAX_PRODUCT_IMAGES } from "@/lib/products/media";
import { normalizeProductImages } from "@/lib/products/media";
import type { ProductImage } from "@/lib/db/types";
import { DEFAULT_PRODUCT_CATEGORY } from "@/lib/admin/product-categories";
import { deriveProductSlug } from "@/lib/products/slug";
import {
  DEFAULT_DISCOUNT_PERCENT,
  deriveDiscountPercentFromPrices,
} from "@/lib/products/pricing";
import { filterValidBadges, filterValidSeasons } from "@/lib/products/catalog-options";

export type AdminProductRow = {
  id: string;
  name: string;
  slug?: string | null;
  title_en: string | null;
  title_ar?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  dietary?: string[] | null;
  badges?: string[] | null;
  seasons?: string[] | null;
  category?: string | null;
  category_id?: string | null;
  sku: string | null;
  barcode?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  stock: number;
  price_egp: number;
  compare_price_egp?: number | null;
  is_active: boolean;
  image_url?: string | null;
  images?: unknown;
  video_url?: string | null;
  weight_grams?: number | null;
  pieces_count?: number | null;
  updated_at?: string | null;
  linked_addon_ids?: string[];
  tag_ids?: string[];
  publish_at?: string | null;
  discount_ends_at?: string | null;
};

export type ProductVariantFormItem = {
  id?: string;
  name: string;
  sku: string;
  barcode: string;
  price_egp: string;
  compare_price_egp: string;
  stock: string;
  weight_grams: string;
  pieces_count: string;
  option_size: string;
  option_color: string;
  is_active: boolean;
};

export const EMPTY_PRODUCT_VARIANT: ProductVariantFormItem = {
  name: "",
  sku: "",
  barcode: "",
  price_egp: "",
  compare_price_egp: "",
  stock: "0",
  weight_grams: "",
  pieces_count: "",
  option_size: "",
  option_color: "",
  is_active: true,
};

export type CatalogStats = {
  total: number;
  active: number;
  draft: number;
  out_of_stock: number;
  low_stock: number;
  revenue_estimate_egp: number;
};

export type ProductsListMeta = {
  role?: string;
  permission?: "full" | "limited" | "view" | "none";
  can_write?: boolean;
  can_delete?: boolean;
};

export type ProductsListResponse = {
  products: AdminProductRow[];
  total: number;
  page: number;
  limit: number;
  stats: CatalogStats;
  meta?: ProductsListMeta;
};

export type StockStateFilter = "" | "in_stock" | "low" | "out";

export type ProductImageFormItem = {
  url: string;
  alt_en: string;
  alt_ar: string;
};

export type ProductFormState = {
  name: string;
  slug: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  ingredients: string;
  category: string;
  sku: string;
  price_egp: string;
  discount_percent: string;
  compare_price_egp: string;
  stock: string;
  badges: string;
  seasons: string;
  weight_grams: string;
  pieces_count: string;
  image_url: string;
  images: ProductImageFormItem[];
  video_url: string;
  is_active: boolean;
  /** يضيف شارة featured وتعرض المنتج في كاروسيل الصفحة الرئيسية */
  show_on_homepage: boolean;
  linked_addon_ids: string[];
  meta_title: string;
  meta_description: string;
  barcode: string;
  category_id: string;
  tag_ids: string[];
  variants: ProductVariantFormItem[];
  publish_at: string;
  discount_ends_at: string;
};

export const EMPTY_PRODUCT_IMAGE_SLOT: ProductImageFormItem = {
  url: "",
  alt_en: "",
  alt_ar: "",
};

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: "",
  slug: "",
  title_en: "",
  title_ar: "",
  description_en: "",
  description_ar: "",
  ingredients: "",
  category: DEFAULT_PRODUCT_CATEGORY,
  sku: "",
  price_egp: "",
  discount_percent: String(DEFAULT_DISCOUNT_PERCENT),
  compare_price_egp: "",
  stock: "0",
  badges: "",
  seasons: "",
  weight_grams: "",
  pieces_count: "",
  image_url: "",
  images: [{ ...EMPTY_PRODUCT_IMAGE_SLOT }],
  video_url: "",
  is_active: true,
  show_on_homepage: false,
  linked_addon_ids: [],
  meta_title: "",
  meta_description: "",
  barcode: "",
  category_id: "",
  tag_ids: [],
  variants: [],
  publish_at: "",
  discount_ends_at: "",
};

/** هل المنتج مُعلَّم للصفحة الرئيسية (شارة featured) */
export function badgesIncludeHomepage(badgesCsv: string): boolean {
  return badgesCsv
    .split(/[\n,،]/g)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .includes("featured");
}

/** مزامنة حقل الشارات مع خيار الصفحة الرئيسية */
export function syncBadgesWithHomepage(badgesCsv: string, showOnHomepage: boolean): string {
  const list = filterValidBadges(
    badgesCsv
      .split(/[\n,،]/g)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  ).filter((b) => b !== "featured");
  if (showOnHomepage) list.push("featured");
  return list.join(", ");
}

export function imagesFromRow(item: AdminProductRow): ProductImageFormItem[] {
  const normalized = normalizeProductImages(item.images, item.image_url);
  const mapped = normalized.map((img: ProductImage) => ({
    url: img.url,
    alt_en: img.alt_en ?? "",
    alt_ar: img.alt_ar ?? "",
  }));
  return mapped.length > 0 ? mapped : [{ ...EMPTY_PRODUCT_IMAGE_SLOT }];
}

export function rowToProductForm(item: AdminProductRow): ProductFormState {
  const images = imagesFromRow(item);
  return {
    name: item.name ?? "",
    slug: item.slug ?? "",
    title_en: item.title_en ?? "",
    title_ar: item.title_ar ?? "",
    description_en: item.description_en ?? "",
    description_ar: item.description_ar ?? "",
    ingredients: (item.dietary ?? []).join(", "),
    category: item.category ?? "",
    sku: item.sku ?? "",
    price_egp: String(item.price_egp ?? ""),
    discount_percent: (() => {
      const sale = Number(item.price_egp);
      const compare = Number(item.compare_price_egp);
      if (
        item.compare_price_egp != null &&
        Number.isFinite(compare) &&
        compare > sale &&
        Number.isFinite(sale) &&
        sale > 0
      ) {
        return deriveDiscountPercentFromPrices(sale, compare) || String(DEFAULT_DISCOUNT_PERCENT);
      }
      return String(DEFAULT_DISCOUNT_PERCENT);
    })(),
    compare_price_egp:
      item.compare_price_egp != null && Number.isFinite(Number(item.compare_price_egp))
        ? String(item.compare_price_egp)
        : "",
    stock: String(item.stock ?? 0),
    badges: (item.badges ?? []).join(", "),
    seasons: (item.seasons ?? []).join(", "),
    weight_grams:
      item.weight_grams != null && Number.isFinite(Number(item.weight_grams))
        ? String(item.weight_grams)
        : "",
    pieces_count:
      item.pieces_count != null && Number.isFinite(Number(item.pieces_count))
        ? String(item.pieces_count)
        : "",
    image_url: item.image_url ?? images[0]?.url ?? "",
    images: images.slice(0, MAX_PRODUCT_IMAGES),
    video_url: item.video_url ?? "",
    is_active: item.is_active,
    show_on_homepage: (item.badges ?? []).includes("featured"),
    linked_addon_ids: item.linked_addon_ids ?? [],
    meta_title: item.meta_title ?? (item.title_en ?? item.name ?? "").slice(0, 70),
    meta_description: item.meta_description ?? (item.description_en ?? "").slice(0, 160),
    barcode: item.barcode ?? "",
    category_id: item.category_id ?? "",
    tag_ids: item.tag_ids ?? [],
    variants: [],
    publish_at: item.publish_at ? toDatetimeLocalValue(item.publish_at) : "",
    discount_ends_at: item.discount_ends_at ? toDatetimeLocalValue(item.discount_ends_at) : "",
  };
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function formToApiPayload(form: ProductFormState) {
  const ingredientsList = form.ingredients
    .split(/[\n,]/g)
    .map((x) => x.trim())
    .filter(Boolean);
  const badgesList = filterValidBadges(
    syncBadgesWithHomepage(form.badges, form.show_on_homepage)
      .split(/[\n,،]/g)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  );
  const seasonsList = filterValidSeasons(
    form.seasons
      .split(/[\n,،]/g)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  );
  const compareRaw = form.compare_price_egp.trim();
  const compareN = compareRaw ? Number(compareRaw) : NaN;
  const compare_price_egp =
    compareRaw && Number.isFinite(compareN) && compareN > 0 ? compareN : null;
  const weightRaw = form.weight_grams.trim();
  const weightN = weightRaw ? Number(weightRaw) : NaN;
  const weight_grams =
    weightRaw && Number.isFinite(weightN) && weightN > 0 ? Math.floor(weightN) : null;
  const piecesRaw = form.pieces_count.trim();
  const piecesN = piecesRaw ? Number(piecesRaw) : NaN;
  const pieces_count =
    piecesRaw && Number.isFinite(piecesN) && piecesN > 0 ? Math.floor(piecesN) : null;

  const images = form.images
    .map((img, order) => ({
      url: img.url.trim(),
      alt_en: img.alt_en.trim() || null,
      alt_ar: img.alt_ar.trim() || null,
      order,
    }))
    .filter((img) => img.url);

  const primary = images[0]?.url ?? (form.image_url.trim() || null);

  return {
    name: form.name.trim(),
    slug: deriveProductSlug(form.name, form.slug.trim() || undefined),
    title_en: form.title_en.trim() || null,
    title_ar: form.title_ar.trim() || null,
    description_en: form.description_en.trim() || null,
    description_ar: form.description_ar.trim() || null,
    description: form.description_en.trim() || form.description_ar.trim() || null,
    dietary: ingredientsList,
    badges: badgesList,
    seasons: seasonsList,
    category: form.category.trim() || null,
    sku: form.sku.trim() || null,
    price_egp: Number(form.price_egp),
    compare_price_egp,
    stock: Number(form.stock || 0),
    weight_grams,
    pieces_count,
    image_url: primary,
    images,
    video_url: form.video_url.trim() || null,
    is_active: form.is_active,
    linked_addon_ids: form.linked_addon_ids,
    barcode: form.barcode.trim() || null,
    meta_title: form.meta_title.trim() || null,
    meta_description: form.meta_description.trim() || null,
    category_id: form.category_id.trim() || null,
    tag_ids: form.tag_ids,
    publish_at: fromDatetimeLocalValue(form.publish_at),
    discount_ends_at: fromDatetimeLocalValue(form.discount_ends_at),
  };
}
