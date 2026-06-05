import type { Product } from "@/lib/data";
import { getCachedHomepageFeaturedProducts } from "@/lib/storefront/cached-catalog";
import { buildAddonsByProductId } from "@/lib/storefront/enrich-catalog-addons";
import { ProductCarousel } from "@/components/sections/product-carousel";
import { getLangFromCookies } from "@/lib/seo/server";

async function enrichWithLinkedAddons(products: Product[]): Promise<Product[]> {
  const uuids = products
    .map((p) => p.productUuid)
    .filter((id): id is string => Boolean(id));
  if (uuids.length === 0) return products;
  const byProduct = await buildAddonsByProductId(uuids);
  return products.map((p) => {
    const linked = p.productUuid ? byProduct.get(p.productUuid) : undefined;
    if (!linked?.length) return p;
    return { ...p, linkedAddons: linked };
  });
}

/** كاروسيل الرئيسية — منتجات مميزة من قاعدة البيانات */
export async function HomeProductCarousel() {
  const lang = await getLangFromCookies();
  const products = await enrichWithLinkedAddons(
    await getCachedHomepageFeaturedProducts(12, lang),
  );
  return <ProductCarousel products={products} />;
}
