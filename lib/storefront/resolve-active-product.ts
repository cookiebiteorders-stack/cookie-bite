import "server-only";
import type { ProductRow } from "@/lib/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ACTIVE_PRODUCT_SELECT =
  "id, slug, name, title_en, title_ar, description, description_en, description_ar, price_egp, compare_price_egp, image_url, images, video_url, badges, dietary, seasons, category, stock, weight_grams, pieces_count, sku, created_at";

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * يجلب منتجاً نشطاً من Supabase بمفتاح المسار (slug أو UUID احتياطياً).
 */
export async function getActiveProductRowByRouteKey(
  routeKey: string,
): Promise<ProductRow | null> {
  const key = decodeURIComponent(routeKey ?? "").trim();
  if (!key || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();

    const bySlug = await supabase
      .from("products")
      .select(ACTIVE_PRODUCT_SELECT)
      .eq("slug", key)
      .eq("is_active", true)
      .maybeSingle();

    if (bySlug.error) {
      const msg = String(bySlug.error.message ?? "");
      if (!/video_url|column/i.test(msg)) {
        console.error("getActiveProductRowByRouteKey slug", bySlug.error.message);
        return null;
      }
      const legacy = await supabase
        .from("products")
        .select(
          "id, slug, name, title_en, title_ar, description, description_en, description_ar, price_egp, compare_price_egp, image_url, images, badges, dietary, seasons, category, stock, weight_grams, pieces_count, sku, created_at",
        )
        .eq("slug", key)
        .eq("is_active", true)
        .maybeSingle();
      if (!legacy.error && legacy.data) return legacy.data as ProductRow;
      console.error("getActiveProductRowByRouteKey slug legacy", legacy.error?.message);
      return null;
    }

    if (bySlug.data) return bySlug.data as ProductRow;

    if (isUuid(key)) {
      const byId = await supabase
        .from("products")
        .select(ACTIVE_PRODUCT_SELECT)
        .eq("id", key)
        .eq("is_active", true)
        .maybeSingle();
      if (!byId.error && byId.data) return byId.data as ProductRow;
    }

    return null;
  } catch (e) {
    console.error("getActiveProductRowByRouteKey", e);
    return null;
  }
}
