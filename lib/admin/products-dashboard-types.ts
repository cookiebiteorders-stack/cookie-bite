import { MAX_PRODUCT_IMAGES } from "@/lib/products/media";
import { normalizeProductImages } from "@/lib/products/media";
import type { ProductImage } from "@/lib/db/types";
import { DEFAULT_PRODUCT_CATEGORY } from "@/lib/admin/product-categories";
import { deriveProductSlug } from "@/lib/products/slug";

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
  sku: string | null;
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
  meta_title: string;
  meta_description: string;
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
  meta_title: "",
  meta_description: "",
};

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
    meta_title: (item.title_en ?? item.name ?? "").slice(0, 70),
    meta_description: (item.description_en ?? "").slice(0, 160),
  };
}

export function formToApiPayload(form: ProductFormState) {
  const ingredientsList = form.ingredients
    .split(/[\n,]/g)
    .map((x) => x.trim())
    .filter(Boolean);
  const badgesList = form.badges
    .split(/[\n,]/g)
    .map((x) => x.trim())
    .filter(Boolean);
  const seasonsList = form.seasons
    .split(/[\n,]/g)
    .map((x) => x.trim())
    .filter(Boolean);
  const compareRaw = form.compare_price_egp.trim();
  const compare_price_egp =
    compareRaw && Number.isFinite(Number(compareRaw)) ? Number(compareRaw) : null;
  const weightRaw = form.weight_grams.trim();
  const weight_grams =
    weightRaw && Number.isFinite(Number(weightRaw)) ? Number(weightRaw) : null;
  const piecesRaw = form.pieces_count.trim();
  const pieces_count =
    piecesRaw && Number.isFinite(Number(piecesRaw)) ? Number(piecesRaw) : null;

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
  };
}
