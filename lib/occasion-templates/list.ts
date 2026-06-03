import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OccasionTemplate, SuggestedProductRef } from "@/lib/occasion-templates/types";

function parseSuggestedProducts(raw: unknown): SuggestedProductRef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const product_id = String(o.product_id ?? o.productId ?? "");
      const quantity = Number(o.quantity ?? 1);
      if (!product_id || quantity < 1) return null;
      return { product_id, quantity: Math.min(99, Math.floor(quantity)) };
    })
    .filter((x): x is SuggestedProductRef => x !== null);
}

function rowToTemplate(row: Record<string, unknown>): OccasionTemplate {
  return {
    id: String(row.id),
    name_ar: String(row.name_ar),
    name_en: (row.name_en as string | null) ?? null,
    occasion_type: String(row.occasion_type),
    emoji: (row.emoji as string | null) ?? null,
    description_ar: (row.description_ar as string | null) ?? null,
    description_en: (row.description_en as string | null) ?? null,
    suggested_products: parseSuggestedProducts(row.suggested_products),
    suggested_addons: Array.isArray(row.suggested_addons)
      ? (row.suggested_addons as string[])
      : [],
    suggested_message_ar: (row.suggested_message_ar as string | null) ?? null,
    suggested_message_en: (row.suggested_message_en as string | null) ?? null,
    suggested_box_code: (row.suggested_box_code as string | null) ?? null,
    ribbon_color: (row.ribbon_color as string | null) ?? "gold",
    wrap_style: (row.wrap_style as string | null) ?? "kraft",
    card_design: (row.card_design as string | null) ?? "birthday",
    cover_image: (row.cover_image as string | null) ?? null,
    sort_order: Number(row.sort_order ?? 0),
    is_featured: Boolean(row.is_featured),
  };
}

export async function listOccasionTemplates(featuredOnly = false): Promise<OccasionTemplate[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("occasion_templates")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (featuredOnly) {
    query = query.eq("is_featured", true);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => rowToTemplate(row as Record<string, unknown>));
}
