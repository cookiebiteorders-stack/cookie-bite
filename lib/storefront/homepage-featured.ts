import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Product } from "@/lib/data";
import type { ProductRow } from "@/lib/db/types";
import type { Lang } from "@/lib/i18n/translations";
import { productRowToStorefrontProduct } from "@/lib/storefront/map-product-row";

const FALLBACK_DESC = "Fresh handcrafted cookies from Cookie Bite.";

/** منتجات شارة featured النشطة — لكاروسيل الصفحة الرئيسية */
export async function getHomepageFeaturedProducts(
  limit = 12,
  lang: Lang = "en",
): Promise<Product[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .contains("badges", ["featured"])
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error || !data?.length) return [];

    return (data as ProductRow[]).map((row) =>
      productRowToStorefrontProduct(row, FALLBACK_DESC, lang),
    );
  } catch (e) {
    console.error("getHomepageFeaturedProducts", e);
    return [];
  }
}
