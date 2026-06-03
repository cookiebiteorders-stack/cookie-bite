import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MysteryBoxRule } from "@/lib/mystery-box/types";

function rowToRule(row: Record<string, unknown>): MysteryBoxRule {
  return {
    id: String(row.id),
    occasion: String(row.occasion),
    budget_min: Number(row.budget_min),
    budget_max: Number(row.budget_max),
    product_categories: Array.isArray(row.product_categories)
      ? (row.product_categories as string[])
      : [],
    min_items: Number(row.min_items),
    max_items: Number(row.max_items),
    description_ar: (row.description_ar as string | null) ?? null,
    description_en: (row.description_en as string | null) ?? null,
  };
}

export async function findMysteryBoxRule(
  occasion: string,
  budget: number,
): Promise<MysteryBoxRule | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mystery_box_rules")
    .select("*")
    .eq("occasion", occasion)
    .eq("is_active", true)
    .lte("budget_min", budget)
    .gte("budget_max", budget)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return rowToRule(data as Record<string, unknown>);
}

export async function listActiveMysteryRules(): Promise<MysteryBoxRule[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mystery_box_rules")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => rowToRule(row as Record<string, unknown>));
}
