import type { Product, ProductVariant } from "@/lib/data";
import { dedupeCartSelectedAddons } from "@/lib/addons/dedupe";
import type { CartSelectedAddon } from "@/lib/addons/types";

export type CartVariantSnapshot = {
  name: string;
  size?: string | null;
  weight_grams?: number | null;
  pieces_count?: number | null;
  sku?: string | null;
};

export type CartLine = {
  id: string;
  /** slug — used in checkout API */
  productId: string;
  /** UUID — used for analytics / recommendations */
  productUuid?: string;
  name: string;
  priceEgp: number;
  image: string;
  quantity: number;
  addons: CartSelectedAddon[];
  addonsTotalEgp: number;
  finalUnitPriceEgp: number;
  /** UUID للحجم المختار من product_variants */
  variantId?: string;
  /** تسمية معروضة للحجم مثل «وسط» */
  variantLabel?: string;
  /** لقطة الحجم للفاتورة والطلب */
  variantSnapshot?: CartVariantSnapshot;
  giftBox?: {
    box_size: string;
    selected_products: {
      product_id: string;
      quantity: number;
      price_snapshot: number;
      name?: string;
      image?: string;
    }[];
    message?: string | null;
    total_price: number;
    builder?: Record<string, unknown>;
  };
  bundleOffer?: {
    offer_id: string;
    name_en: string;
    name_ar: string;
    offer_price_egp: number;
    original_total_egp: number;
    savings_egp: number;
    products: {
      product_id: string;
      slug: string;
      name: string;
      price_snapshot: number;
      image?: string;
    }[];
    addons: {
      addon_id: string;
      option_id: string;
      name: string;
      price_snapshot: number;
    }[];
  };
};

export function lineFromProduct(
  product: Product,
  quantity: number,
  addons: CartSelectedAddon[] = [],
  addonsTotalEgp = 0,
  variant?: ProductVariant | null,
): CartLine {
  const normalizedAddons = dedupeCartSelectedAddons(addons);
  const lineId = buildCartLineId(product.id, normalizedAddons, variant?.id);
  const basePrice = variant ? Number(variant.price) : Number(product.price);
  const variantSnapshot: CartVariantSnapshot | undefined = variant
    ? {
        name: variant.name,
        size: variant.size ?? null,
        weight_grams: variant.weightGrams ?? null,
        pieces_count: variant.piecesCount ?? null,
        sku: variant.sku ?? null,
      }
    : undefined;
  return {
    id: lineId,
    productId: product.id,
    productUuid: product.productUuid,
    name: product.name,
    priceEgp: basePrice,
    image: variant?.image?.trim() || product.image,
    quantity: Math.min(99, Math.max(1, quantity)),
    addons: normalizedAddons,
    addonsTotalEgp,
    finalUnitPriceEgp: basePrice + addonsTotalEgp,
    variantId: variant?.id,
    variantLabel: variant?.name,
    variantSnapshot,
  };
}

export function bundleOfferLine(input: {
  offerId: string;
  name: string;
  nameEn: string;
  nameAr: string;
  image: string;
  offerPriceEgp: number;
  originalTotalEgp: number;
  savingsEgp: number;
  products: {
    product_id: string;
    slug: string;
    name: string;
    price_snapshot: number;
    image?: string;
  }[];
  addons: {
    addon_id: string;
    option_id: string;
    name: string;
    price_snapshot: number;
  }[];
}): CartLine {
  return {
    id: `bundle-offer:${input.offerId}`,
    productId: `bundle-offer:${input.offerId}`,
    name: input.name,
    image: input.image,
    priceEgp: input.offerPriceEgp,
    quantity: 1,
    addons: [],
    addonsTotalEgp: 0,
    finalUnitPriceEgp: input.offerPriceEgp,
    bundleOffer: {
      offer_id: input.offerId,
      name_en: input.nameEn,
      name_ar: input.nameAr,
      offer_price_egp: input.offerPriceEgp,
      original_total_egp: input.originalTotalEgp,
      savings_egp: input.savingsEgp,
      products: input.products,
      addons: input.addons,
    },
  };
}

export function giftBoxLine(input: {
  id: string;
  name: string;
  image: string;
  boxSize: string;
  selectedProducts: {
    product_id: string;
    quantity: number;
    price_snapshot: number;
    name?: string;
    image?: string;
  }[];
  message?: string | null;
  totalPrice: number;
  builder?: Record<string, unknown>;
}): CartLine {
  return {
    id: `gift-box:${input.id}`,
    productId: `gift-box:${input.id}`,
    name: input.name,
    image: input.image,
    priceEgp: input.totalPrice,
    quantity: 1,
    addons: [],
    addonsTotalEgp: 0,
    finalUnitPriceEgp: input.totalPrice,
    giftBox: {
      box_size: input.boxSize,
      selected_products: input.selectedProducts,
      message: input.message ?? null,
      total_price: input.totalPrice,
      builder: input.builder,
    },
  };
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.finalUnitPriceEgp * l.quantity, 0);
}

export function cartItemCount(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function buildCartLineId(
  productId: string,
  addons: CartSelectedAddon[],
  variantId?: string | null,
) {
  const base = variantId ? `${productId}@@v:${variantId}` : productId;
  if (!addons.length) return base;
  const parts = addons
    .map((a) => {
      const options = a.options
        .map((o) => `${o.option_id}:${o.quantity}`)
        .sort()
        .join("|");
      return `${a.addon_id}=${options}`;
    })
    .sort()
    .join(";");
  return `${base}::${parts}`;
}
