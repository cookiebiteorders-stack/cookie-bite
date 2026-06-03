import { getHomepageFeaturedProducts } from "@/lib/storefront/homepage-featured";
import { ProductCarousel } from "@/components/sections/product-carousel";
import { getLangFromCookies } from "@/lib/seo/server";

/** كاروسيل الرئيسية — منتجات مميزة من قاعدة البيانات */
export async function HomeProductCarousel() {
  const lang = await getLangFromCookies();
  const products = await getHomepageFeaturedProducts(12, lang);
  return <ProductCarousel products={products} />;
}
