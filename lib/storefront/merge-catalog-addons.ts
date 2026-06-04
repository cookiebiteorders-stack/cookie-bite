import type { Addon } from "@/lib/addons/types";
import type { CatalogProduct } from "@/lib/storefront/shop-catalog-client";

export function mergeAddonsIntoCatalog(
  products: CatalogProduct[],
  byProductId: Record<string, Addon[] | undefined>,
): CatalogProduct[] {
  return products.map((p) => {
    const uuid = p.productUuid;
    const linked = uuid ? byProductId[uuid] : undefined;
    if (!linked?.length) return p;
    return { ...p, linkedAddons: linked };
  });
}
