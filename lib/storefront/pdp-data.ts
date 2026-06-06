import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/lib/db/types";
import type { Product } from "@/lib/data";
import type { Lang } from "@/lib/i18n/translations";
import {
  FBT_COMPANION_LIMIT,
  FBT_RULES_BY_CATEGORY,
  FBT_RULES_BY_SLUG,
} from "@/lib/storefront/fbt-rules";
import { productRowToStorefrontProduct } from "@/lib/storefront/map-product-row";
import { getActiveProductRowByRouteKey } from "@/lib/storefront/resolve-active-product";

const FALLBACK_DESC = "Fresh handcrafted treats from Cookie Bite — New Cairo.";

export async function getActivePdpProduct(
  slug: string,
  lang: Lang = "en",
): Promise<Product | null> {
  const row = await getActiveProductRowByRouteKey(slug);
  if (!row) return null;
  return productRowToStorefrontProduct(row, FALLBACK_DESC, lang);
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

async function rowsToProducts(rows: ProductRow[], lang: Lang): Promise<Product[]> {
  return rows.map((r) => productRowToStorefrontProduct(r, FALLBACK_DESC, lang));
}

async function fetchActiveRowsBySlugs(
  slugs: string[],
  excludeSlug: string,
): Promise<ProductRow[]> {
  if (!slugs.length) return [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .neq("slug", excludeSlug)
      .in("slug", slugs);
    const rows = (data as ProductRow[] | null) ?? [];
    const order = new Map(slugs.map((s, i) => [s, i]));
    return rows.sort(
      (a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99),
    );
  } catch (e) {
    console.error("fetchActiveRowsBySlugs", e);
    return [];
  }
}

async function fetchActiveRowsByCategories(
  categories: string[],
  excludeSlug: string,
  limit: number,
): Promise<ProductRow[]> {
  if (!categories.length || limit <= 0) return [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .neq("slug", excludeSlug)
      .in("category", categories)
      .limit(limit * 2);
    return ((data as ProductRow[] | null) ?? []).slice(0, limit);
  } catch (e) {
    console.error("fetchActiveRowsByCategories", e);
    return [];
  }
}

/** منتجات تُشترى معاً في نفس الطلب (تعايش في order_items). */
async function getCoOccurringRows(
  productUuid: string,
  excludeSlug: string,
  limit: number,
): Promise<ProductRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data: mine } = await supabase
      .from("order_items")
      .select("order_id")
      .eq("product_id", productUuid)
      .limit(500);
    const orderIds = [...new Set((mine ?? []).map((r) => r.order_id as string))];
    if (!orderIds.length) return [];

    const { data: siblings } = await supabase
      .from("order_items")
      .select("product_id")
      .in("order_id", orderIds)
      .neq("product_id", productUuid)
      .not("product_id", "is", null)
      .limit(2000);

    const counts = new Map<string, number>();
    for (const row of siblings ?? []) {
      const pid = row.product_id as string;
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
    const ranked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .slice(0, limit * 2);
    if (!ranked.length) return [];

    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .neq("slug", excludeSlug)
      .in("id", ranked);
    const rows = (products as ProductRow[] | null) ?? [];
    const rank = new Map(ranked.map((id, i) => [id, i]));
    return rows
      .sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99))
      .slice(0, limit);
  } catch (e) {
    console.error("getCoOccurringRows", e);
    return [];
  }
}

export type PdpReview = {
  id: string;
  rating: number;
  body: string | null;
  photoUrl: string | null;
  helpfulCount: number;
  createdAt: string;
  isFeatured: boolean;
  isVerifiedPurchase: boolean;
};

export async function getApprovedProductReviews(
  productUuid: string,
  limit = 48,
): Promise<PdpReview[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  try {
    const supabase = await createSupabaseServerClient();
    const extended = await supabase
      .from("reviews")
      .select("id, rating, body, photo_url, helpful_count, created_at, is_featured, order_id")
      .eq("product_id", productUuid)
      .eq("is_approved", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    const legacy =
      extended.error && /photo_url|helpful_count/i.test(extended.error.message)
        ? await supabase
            .from("reviews")
            .select("id, rating, body, created_at, is_featured")
            .eq("product_id", productUuid)
            .eq("is_approved", true)
            .order("is_featured", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(limit)
        : null;

    const data = legacy?.data ?? extended.data ?? [];
    return data.map((r) => ({
      id: r.id as string,
      rating: r.rating as number,
      body: (r.body as string | null) ?? null,
      photoUrl: (r as { photo_url?: string | null }).photo_url ?? null,
      helpfulCount: Number((r as { helpful_count?: number }).helpful_count) || 0,
      createdAt: r.created_at as string,
      isFeatured: Boolean(r.is_featured),
      isVerifiedPurchase: Boolean((r as { order_id?: string | null }).order_id),
    }));
  } catch (e) {
    console.error("getApprovedProductReviews", e);
    return [];
  }
}

/** مرافقون لـ «يُشترى معاً» — قواعد يدوية ثم تعايش الطلبات ثم نفس الفئة. */
export async function getFbtStorefrontProducts(
  row: ProductRow,
  lang: Lang = "en",
): Promise<Product[]> {
  const excludeSlug = row.slug;
  const limit = FBT_COMPANION_LIMIT;
  const seen = new Set<string>([excludeSlug]);
  const collected: ProductRow[] = [];

  const pushRows = (rows: ProductRow[]) => {
    for (const r of rows) {
      if (collected.length >= limit) break;
      if (seen.has(r.slug)) continue;
      seen.add(r.slug);
      collected.push(r);
    }
  };

  const slugRule = FBT_RULES_BY_SLUG[excludeSlug];
  const categoryRule = row.category
    ? FBT_RULES_BY_CATEGORY[String(row.category)]
    : undefined;
  const rule = slugRule ?? categoryRule;

  if (rule?.companions?.length) {
    pushRows(await fetchActiveRowsBySlugs(rule.companions, excludeSlug));
  }
  if (collected.length < limit && rule?.fromCategories?.length) {
    pushRows(
      await fetchActiveRowsByCategories(
        rule.fromCategories,
        excludeSlug,
        limit - collected.length,
      ),
    );
  }
  if (collected.length < limit) {
    pushRows(await getCoOccurringRows(row.id, excludeSlug, limit - collected.length));
  }
  if (collected.length < limit) {
    const related = await getRelatedStorefrontProducts(
      (row.category as string | null) ?? null,
      excludeSlug,
      limit - collected.length + 2,
      lang,
    );
    const relatedRows = await fetchActiveRowsBySlugs(
      related.map((p) => p.id),
      excludeSlug,
    );
    pushRows(relatedRows);
  }

  return rowsToProducts(collected.slice(0, limit), lang);
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
