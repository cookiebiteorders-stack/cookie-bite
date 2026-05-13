import type { Product } from "@/lib/data";
import type { ProductRow } from "@/lib/db/types";

const BADGE_SET = new Set(["bestseller", "new", "trending"]);

/**
 * يحوّل صف منتج من Supabase إلى شكل `Product` للمتجر.
 * `id` في الناتج = **slug** (روابط PDP والسلة وPaymob).
 */
export function productRowToStorefrontProduct(
  row: ProductRow,
  descriptionFallback: string,
): Product {
  const name =
    row.title_en?.trim() || row.title_ar?.trim() || row.name || row.slug;
  const description =
    row.description_en?.trim() ||
    row.description_ar?.trim() ||
    row.description?.trim() ||
    descriptionFallback;
  const mainImage =
    (row.images ?? []).find((img) => typeof img?.url === "string" && img.url)?.url ??
    row.image_url ??
    "/images/web-logo.png";
  const badges = (row.badges ?? []).filter(
    (b): b is NonNullable<Product["badges"]>[number] => BADGE_SET.has(String(b)),
  );

  return {
    id: row.slug,
    productUuid: row.id,
    name,
    description,
    price: Number(row.price_egp),
    image: mainImage,
    category: row.category ?? "Classic",
    badges: badges.length ? badges : undefined,
    stock: row.stock,
  };
}
