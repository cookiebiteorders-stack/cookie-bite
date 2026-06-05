import type { AiCatalogProduct } from "@/lib/ai/website-knowledge";

export type ChatClientAction =
  | {
      type: "add_to_cart";
      id: string;
      product_slug: string;
      product_name: string;
      price_egp: number;
      image_url: string | null;
      quantity: number;
      label_en: string;
      label_ar: string;
    }
  | {
      type: "apply_promo";
      code: string;
      discount_egp: number | null;
      label_en: string;
      label_ar: string;
    };

export function buildAddToCartAction(
  product: Pick<
    AiCatalogProduct,
    "id" | "name" | "price_egp" | "shop_path" | "image_url" | "in_stock"
  >,
  locale: "ar" | "en" | "auto" = "auto",
): ChatClientAction | null {
  if (!product.in_stock) return null;
  const slug = product.shop_path.replace(/^\/shop\//, "").split("/")[0];
  if (!slug) return null;
  const ar = locale !== "en";
  return {
    type: "add_to_cart",
    id: `atc-${product.id}`,
    product_slug: slug,
    product_name: product.name,
    price_egp: product.price_egp,
    image_url: product.image_url,
    quantity: 1,
    label_en: `Add ${product.name} to cart`,
    label_ar: `أضف ${product.name} للسلة`,
  };
}

export function buildApplyPromoAction(input: {
  code: string;
  discount_egp: number | null;
  valid: boolean;
  locale: "ar" | "en" | "auto";
  error_ar?: string;
  error_en?: string;
}): ChatClientAction | null {
  const ar = input.locale !== "en";
  if (!input.valid) return null;
  const discount =
    input.discount_egp != null && input.discount_egp > 0
      ? ar
        ? ` (خصم ${Math.round(input.discount_egp)} ج)`
        : ` (−${Math.round(input.discount_egp)} EGP)`
      : "";
  return {
    type: "apply_promo",
    code: input.code.toUpperCase(),
    discount_egp: input.discount_egp,
    label_en: `Apply code ${input.code.toUpperCase()}${discount}`,
    label_ar: `تطبيق كود ${input.code.toUpperCase()}${discount}`,
  };
}
