import type { Lang } from "@/lib/i18n/translations";
import {
  normalizeProductImages,
  primaryImageFromProduct,
} from "@/lib/products/media";
import type { EnrichedBundleOffer } from "@/lib/offers/types";

export type StorefrontBundleOfferProduct = {
  id: string;
  slug: string;
  name: string;
  price_egp: number;
  image: string;
};

export type StorefrontBundleOfferAddon = {
  addon_id: string;
  option_id: string;
  name: string;
  price: number;
};

export type StorefrontBundleOffer = {
  id: string;
  name: string;
  name_en: string;
  name_ar: string;
  offer_price_egp: number;
  original_total_egp: number;
  savings_egp: number;
  avg_price_per_product_egp: number | null;
  products: StorefrontBundleOfferProduct[];
  addons: StorefrontBundleOfferAddon[];
  ends_at: string | null;
};

export function offerProductImage(images: unknown[], fallback = "/images/web-logo.png") {
  const normalized = normalizeProductImages(images, null);
  return primaryImageFromProduct(normalized, null) || fallback;
}

export function mapOfferToStorefront(
  offer: EnrichedBundleOffer,
  lang: Lang,
): StorefrontBundleOffer {
  const name = lang === "ar" ? offer.name_ar : offer.name_en;
  return {
    id: offer.id,
    name,
    name_en: offer.name_en,
    name_ar: offer.name_ar,
    offer_price_egp: offer.offer_price_egp,
    original_total_egp: offer.original_total_egp,
    savings_egp: offer.savings_egp,
    avg_price_per_product_egp: offer.avg_price_per_product_egp,
    products: offer.products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: lang === "ar" ? p.title_ar || p.name : p.title_en || p.name,
      price_egp: p.price_egp,
      image: offerProductImage(p.images),
    })),
    addons: offer.addons.map((a) => ({
      addon_id: a.addon_id,
      option_id: a.option_id,
      name: a.option_name,
      price: a.price,
    })),
    ends_at: offer.ends_at,
  };
}
