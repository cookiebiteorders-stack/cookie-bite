import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  normalizeProductImages,
  primaryImageFromProduct,
  resolveProductImageUrl,
} from "@/lib/products/media";
import type { Lang } from "@/lib/i18n/translations";
import type { MysteryCandidateProduct } from "@/lib/mystery-box/types";

type DbProduct = {
  id: string;
  slug: string | null;
  title_en: string | null;
  title_ar: string | null;
  name: string | null;
  price_egp: number;
  category: string | null;
  dietary: string[] | null;
  image_url: string | null;
  images: unknown;
  stock: number | null;
  is_active: boolean | null;
};

function displayName(p: DbProduct, lang: Lang): string {
  if (lang === "ar") {
    return p.title_ar?.trim() || p.title_en?.trim() || p.name?.trim() || "منتج";
  }
  return p.title_en?.trim() || p.title_ar?.trim() || p.name?.trim() || "Product";
}

export async function loadMysteryCandidates(lang: Lang = "en"): Promise<MysteryCandidateProduct[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, title_en, title_ar, name, price_egp, category, dietary, image_url, images, stock, is_active",
    )
    .eq("is_active", true)
    .order("price_egp", { ascending: true });

  if (error || !data) return [];

  return (data as DbProduct[])
    .filter((p) => p.slug?.trim() && Number(p.price_egp) > 0)
    .filter((p) => p.stock == null || p.stock > 0)
    .map((p) => {
      const imagesNormalized = normalizeProductImages(p.images, p.image_url ?? null);
      const imageUrl = resolveProductImageUrl(
        primaryImageFromProduct(imagesNormalized, p.image_url ?? null),
      );
      const category = (p.category ?? "Cookies").trim() || "Cookies";
      return {
        id: p.id,
        slug: p.slug!.trim(),
        name: displayName(p, "en"),
        nameAr: displayName(p, "ar"),
        price: Number(p.price_egp) || 0,
        category,
        imageUrl,
        stock: p.stock ?? null,
        dietary: p.dietary ?? [],
      };
    });
}
