import { getHomepageFeaturedProducts } from "@/lib/storefront/homepage-featured";
import { ProductCarousel } from "@/components/sections/product-carousel";

/** كاروسيل الرئيسية — منتجات مميزة من قاعدة البيانات */
export async function HomeProductCarousel() {
  const products = await getHomepageFeaturedProducts();
  return <ProductCarousel products={products} />;
}
