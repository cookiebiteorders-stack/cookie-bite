import "server-only";

import type { Product } from "@/lib/data";
import type { ProductRow } from "@/lib/db/types";
import { productRowToStorefrontProduct } from "@/lib/storefront/map-product-row";
import { getRelatedStorefrontProducts } from "@/lib/storefront/pdp-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const FALLBACK_DESC = "Fresh handcrafted treats from Cookie Bite — New Cairo.";

type PythonProduct = {
  id: string;
  slug: string;
  name: string;
  price_egp: number;
  image_url: string | null;
  category: string | null;
  stock: number | null;
};

type PythonEnvelope = {
  success?: boolean;
  data?: {
    products?: PythonProduct[];
  };
};

function pythonHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (secret) headers["x-internal-secret"] = secret;
  return headers;
}

function mapPythonProducts(rows: PythonProduct[]): Product[] {
  return rows.map((p) => {
    const row: ProductRow = {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: null,
      title_en: p.name,
      title_ar: p.name,
      description_en: null,
      description_ar: null,
      price_egp: p.price_egp,
      compare_price_egp: null,
      sku: null,
      category: p.category,
      image_url: p.image_url,
      images: p.image_url ? [{ url: p.image_url }] : [],
      video_url: null,
      badges: [],
      dietary: [],
      seasons: [],
      is_active: true,
      stock: p.stock ?? 0,
      weight_grams: null,
      pieces_count: null,
      sanity_id: null,
      created_at: "",
      updated_at: "",
    };
    return productRowToStorefrontProduct(row, FALLBACK_DESC);
  });
}

async function fetchPython(
  path: string,
  revalidateSeconds = 1800,
): Promise<Product[]> {
  const base = process.env.PYTHON_API_URL?.trim().replace(/\/$/, "");
  if (!base) return [];

  try {
    const res = await fetch(`${base}${path}`, {
      headers: pythonHeaders(),
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as PythonEnvelope;
    const rows = json.data?.products ?? [];
    return mapPythonProducts(rows);
  } catch {
    return [];
  }
}

/** Trending picks for homepage / shop sidebar. */
export async function getTrendingRecommendations(
  limit = 8,
  lang: "en" | "ar" = "en",
): Promise<Product[]> {
  const fromPython = await fetchPython(
    `/recommendations/trending?limit=${limit}&lang=${lang}`,
  );
  if (fromPython.length > 0) return fromPython;

  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((r) =>
      productRowToStorefrontProduct(r as ProductRow, FALLBACK_DESC, lang),
    );
  } catch {
    return [];
  }
}

/** PDP carousel — similar products for cart contents or current product. */
export async function getCartBasedRecommendations(
  productUuids: string[],
  excludeSlug: string,
  limit = 6,
  lang: "en" | "ar" = "en",
): Promise<Product[]> {
  const ids = productUuids.filter(Boolean);
  if (ids.length === 0) {
    return getRelatedStorefrontProducts(null, excludeSlug, limit);
  }

  const qs = ids.map((id) => `product_ids=${encodeURIComponent(id)}`).join("&");
  const fromPython = await fetchPython(
    `/recommendations/cart-based?${qs}&limit=${limit}&lang=${lang}`,
  );
  const filtered = fromPython.filter((p) => p.id !== excludeSlug);
  if (filtered.length > 0) return filtered.slice(0, limit);

  const primary = ids[0];
  let category: string | null = null;
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("products")
      .select("category")
      .eq("id", primary)
      .maybeSingle();
    category = (data?.category as string | undefined) ?? null;
  } catch {
    // fallback below
  }
  return getRelatedStorefrontProducts(category, excludeSlug, limit);
}
