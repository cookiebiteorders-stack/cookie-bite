import type { OfferAddonItem, OfferCatalogAddonOption, OfferCatalogProduct } from "@/lib/offers/types";

export function computeOfferPricing(input: {
  productIds: string[];
  addonItems: OfferAddonItem[];
  offerPriceEgp: number;
  products: Pick<OfferCatalogProduct, "id" | "price_egp">[];
  addonOptions: Pick<OfferCatalogAddonOption, "addon_id" | "option_id" | "price">[];
}) {
  const productTotal = input.productIds.reduce((sum, id) => {
    const product = input.products.find((p) => p.id === id);
    return sum + Number(product?.price_egp ?? 0);
  }, 0);

  const addonTotal = input.addonItems.reduce((sum, item) => {
    const option = input.addonOptions.find(
      (o) => o.addon_id === item.addon_id && o.option_id === item.option_id,
    );
    return sum + Number(option?.price ?? 0);
  }, 0);

  const originalTotal = roundMoney(productTotal + addonTotal);
  const avgPerProduct =
    input.productIds.length > 0
      ? roundMoney(input.offerPriceEgp / input.productIds.length)
      : null;

  return {
    original_total_egp: originalTotal,
    avg_price_per_product_egp: avgPerProduct,
    savings_egp: roundMoney(Math.max(0, originalTotal - input.offerPriceEgp)),
  };
}

export function validateOfferComposition(productIds: string[], addonItems: OfferAddonItem[]) {
  const productCount = productIds.length;
  const addonCount = addonItems.length;
  const totalItems = productCount + addonCount;

  if (totalItems < 2) {
    return {
      ok: false as const,
      message: {
        en: "Select at least two items (products and/or add-ons).",
        ar: "اختر عنصرين على الأقل (منتجات و/أو إضافات).",
      },
    };
  }

  if (productCount === 1 && addonCount === 0) {
    return {
      ok: false as const,
      message: {
        en: "A single-product offer needs at least one add-on, or select two or more products.",
        ar: "عرض منتج واحد يحتاج إضافة واحدة على الأقل، أو اختر منتجين أو أكثر.",
      },
    };
  }

  return { ok: true as const };
}

export function isOfferCurrentlyValid(
  offer: Pick<BundleOfferLike, "is_active" | "starts_at" | "ends_at">,
  now = new Date(),
) {
  if (!offer.is_active) return false;
  const starts = new Date(offer.starts_at);
  if (Number.isNaN(starts.getTime()) || starts > now) return false;
  if (offer.ends_at) {
    const ends = new Date(offer.ends_at);
    if (!Number.isNaN(ends.getTime()) && ends <= now) return false;
  }
  return true;
}

type BundleOfferLike = {
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
