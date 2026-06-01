import type { Product } from "@/lib/data";
import type { BuilderProduct } from "@/lib/gift-box-builder/data";

/** Map builder row → cart `Product` (slug required for checkout). */
export function builderProductToCartProduct(p: BuilderProduct): Product | null {
  const slug = p.slug?.trim();
  if (!slug) return null;
  return {
    id: slug,
    productUuid: p.productUuid,
    name: p.name,
    description: "",
    price: p.price,
    image: p.imageUrl,
    category: p.category,
  };
}
