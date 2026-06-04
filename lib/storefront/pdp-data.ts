import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/lib/db/types";
import type { Product } from "@/lib/data";
import type { Lang } from "@/lib/i18n/translations";
import { productRowToStorefrontProduct } from "@/lib/storefront/map-product-row";

const FALLBACK_DESC = "Fresh handcrafted treats from Cookie Bite — New Cairo.";

const PDP_PRODUCT_SELECT =
  "id, slug, name, title_en, title_ar, description, description_en, description_ar, price_egp, compare_price_egp, image_url, images, video_url, badges, category, stock, is_active, created_at, updated_at";

export async function getActivePdpProduct(
  slug: string,
  lang: Lang = "en",
): Promise<Product | null> {
  if (!slug || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("products")
      .select(PDP_PRODUCT_SELECT)
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      const msg = String(error.message ?? "");
      if (/video_url|column/i.test(msg)) {
        const legacy = await supabase
          .from("products")
          .select(
            "id, slug, name, title_en, title_ar, description, description_en, description_ar, price_egp, compare_price_egp, image_url, images, badges, category, stock, is_active, created_at, updated_at",
          )
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();
        if (!legacy.error && legacy.data) {
          return productRowToStorefrontProduct(legacy.data as ProductRow, FALLBACK_DESC, lang);
        }
      }
      console.error("getActivePdpProduct", error.message);
      return null;
    }
    if (!data) return null;
    return productRowToStorefrontProduct(data as ProductRow, FALLBACK_DESC, lang);
  } catch (e) {
    console.error("getActivePdpProduct", e);
    return null;
  }
}

export async function getRelatedStorefrontProducts(
  category: string | null,
  excludeSlug: string,
  limit: number,
  lang: Lang = "en",
): Promise<Product[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  try {
    const supabase = await createSupabaseServerClient();
    let q = supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .neq("slug", excludeSlug)
      .limit(limit * 2);

    if (category?.trim()) {
      q = q.eq("category", category);
    }

    const { data: primary } = await q;
    const rows = (primary as ProductRow[] | null) ?? [];

    if (rows.length >= limit) {
      return rows
        .slice(0, limit)
        .map((r) => productRowToStorefrontProduct(r, FALLBACK_DESC, lang));
    }

    const { data: fallback } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .neq("slug", excludeSlug)
      .limit(limit);

    const fb = (fallback as ProductRow[] | null) ?? [];
    const seen = new Set(rows.map((r) => r.slug));
    const merged = [...rows];
    for (const r of fb) {
      if (!seen.has(r.slug)) {
        seen.add(r.slug);
        merged.push(r);
      }
      if (merged.length >= limit) break;
    }
    return merged
      .slice(0, limit)
      .map((r) => productRowToStorefrontProduct(r, FALLBACK_DESC, lang));
  } catch (e) {
    console.error("getRelatedStorefrontProducts", e);
    return [];
  }
}

export async function listAllActiveSlugs(): Promise<string[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("products")
      .select("slug")
      .eq("is_active", true);

    if (error || !data) return [];
    return (data as { slug: string }[]).map((r) => r.slug).filter(Boolean);
  } catch {
    return [];
  }
}
