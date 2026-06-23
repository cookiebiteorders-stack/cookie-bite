import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Addon, AddonCategory, AddonOption } from "@/lib/addons/types";
import { dedupeAddonOptions } from "@/lib/addons/dedupe";

function parseOptions(raw: unknown): AddonOption[] {
  if (!Array.isArray(raw)) return [];
  return dedupeAddonOptions(
    raw
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const row = x as Record<string, unknown>;
        return {
          id: String(row.id ?? ""),
          name: String(row.name ?? ""),
          size: row.size != null ? String(row.size) : null,
          weight_grams:
            row.weight_grams != null && Number.isFinite(Number(row.weight_grams))
              ? Number(row.weight_grams)
              : null,
          price: Number(row.price) || 0,
          stock:
            row.stock != null && Number.isFinite(Number(row.stock))
              ? Math.max(0, Math.floor(Number(row.stock)))
              : null,
          quantity_limit:
            row.quantity_limit != null && Number.isFinite(Number(row.quantity_limit))
              ? Math.max(1, Math.floor(Number(row.quantity_limit)))
              : null,
          default_selected: Boolean(row.default_selected),
        };
      })
      .filter((o) => o.id && o.name),
  );
}

function addonRowToAddon(row: Record<string, unknown>): Addon {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    description: (row.description as string | null) ?? null,
    type: (row.type as Addon["type"]) ?? "single_choice",
    required: Boolean(row.required),
    options: parseOptions(row.options),
    category_id: row.category_id ? String(row.category_id) : null,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

export async function listAddonCategoriesWithItems(): Promise<AddonCategory[]> {
  const supabase = createSupabaseAdminClient();
  const { data: categories, error } = await supabase
    .from("addon_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("listAddonCategoriesWithItems categories", error);
    return [];
  }

  const { data: addons, error: addonErr } = await supabase
    .from("addons")
    .select("*")
    .not("category_id", "is", null);

  if (addonErr) {
    console.error("listAddonCategoriesWithItems addons", addonErr);
  }

  const addonByCategory = new Map<string, Addon>();
  for (const row of addons ?? []) {
    const addon = addonRowToAddon(row as Record<string, unknown>);
    if (addon.category_id) addonByCategory.set(addon.category_id, addon);
  }

  return (categories ?? []).map((row) => {
    const cat = row as Record<string, unknown>;
    const id = String(cat.id);
    const linked = addonByCategory.get(id);
    return {
      id,
      name: String(cat.name ?? ""),
      description: (cat.description as string | null) ?? null,
      selection_type: (cat.selection_type as AddonCategory["selection_type"]) ?? "single_choice",
      required: Boolean(cat.required),
      sort_order: Number(cat.sort_order ?? 0),
      created_at: cat.created_at as string | undefined,
      updated_at: cat.updated_at as string | undefined,
      addon_id: linked?.id ?? null,
      items: linked?.options ?? [],
    } satisfies AddonCategory;
  });
}

export async function getAddonContainerForCategory(categoryId: string): Promise<Addon | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("addons")
    .select("*")
    .eq("category_id", categoryId)
    .maybeSingle();
  return data ? addonRowToAddon(data as Record<string, unknown>) : null;
}

export function categoryToStorefrontAddon(category: AddonCategory, container: Addon | null): Addon | null {
  if (!container) return null;
  return {
    ...container,
    name: category.name,
    description: category.description,
    type: category.selection_type,
    required: category.required,
    options: container.options,
    category_id: category.id,
  };
}

export async function createAddonCategory(input: {
  name: string;
  description?: string | null;
  selection_type: AddonCategory["selection_type"];
  required?: boolean;
  sort_order?: number;
}): Promise<AddonCategory | null> {
  const supabase = createSupabaseAdminClient();
  const { data: cat, error } = await supabase
    .from("addon_categories")
    .insert({
      name: input.name.trim(),
      description: input.description ?? null,
      selection_type: input.selection_type,
      required: Boolean(input.required),
      sort_order: input.sort_order ?? 0,
    })
    .select("*")
    .single();
  if (error || !cat) {
    console.error("createAddonCategory", error);
    return null;
  }
  const categoryId = String((cat as Record<string, unknown>).id);
  const { data: addon, error: addonErr } = await supabase
    .from("addons")
    .insert({
      name: input.name.trim(),
      description: input.description ?? null,
      type: input.selection_type,
      required: Boolean(input.required),
      options: [],
      category_id: categoryId,
    })
    .select("*")
    .single();
  if (addonErr) {
    console.error("createAddonCategory container", addonErr);
    await supabase.from("addon_categories").delete().eq("id", categoryId);
    return null;
  }
  const rows = await listAddonCategoriesWithItems();
  return rows.find((c) => c.id === categoryId) ?? null;
}

export async function updateAddonCategoryMeta(
  id: string,
  patch: Partial<Pick<AddonCategory, "name" | "description" | "selection_type" | "required" | "sort_order">>,
): Promise<AddonCategory | null> {
  const supabase = createSupabaseAdminClient();
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) dbPatch.name = patch.name.trim();
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.selection_type != null) dbPatch.selection_type = patch.selection_type;
  if (patch.required != null) dbPatch.required = patch.required;
  if (patch.sort_order != null) dbPatch.sort_order = patch.sort_order;

  const { error } = await supabase.from("addon_categories").update(dbPatch).eq("id", id);
  if (error) {
    console.error("updateAddonCategoryMeta", error);
    return null;
  }

  const container = await getAddonContainerForCategory(id);
  if (container) {
    const addonPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.name != null) addonPatch.name = patch.name.trim();
    if (patch.description !== undefined) addonPatch.description = patch.description;
    if (patch.selection_type != null) addonPatch.type = patch.selection_type;
    if (patch.required != null) addonPatch.required = patch.required;
    await supabase.from("addons").update(addonPatch).eq("id", container.id);
  }

  const rows = await listAddonCategoriesWithItems();
  return rows.find((c) => c.id === id) ?? null;
}

export async function saveAddonCategoryItems(
  categoryId: string,
  items: AddonOption[],
): Promise<AddonCategory | null> {
  const supabase = createSupabaseAdminClient();
  const container = await getAddonContainerForCategory(categoryId);
  if (!container) return null;
  const options = dedupeAddonOptions(items);
  const { error } = await supabase
    .from("addons")
    .update({ options, updated_at: new Date().toISOString() })
    .eq("id", container.id);
  if (error) {
    console.error("saveAddonCategoryItems", error);
    return null;
  }
  const rows = await listAddonCategoriesWithItems();
  return rows.find((c) => c.id === categoryId) ?? null;
}

export async function mergeAddonCategories(
  targetId: string,
  sourceIds: string[],
): Promise<{ ok: true; category: AddonCategory } | { ok: false; error: string }> {
  const uniqueSources = [...new Set(sourceIds.filter((id) => id && id !== targetId))];
  if (uniqueSources.length === 0) {
    return { ok: false, error: "No source categories to merge." };
  }

  const supabase = createSupabaseAdminClient();
  const targetContainer = await getAddonContainerForCategory(targetId);
  if (!targetContainer) {
    return { ok: false, error: "Target category has no add-on container." };
  }

  let mergedOptions = [...targetContainer.options];
  const sourceAddonIds: string[] = [];

  for (const sourceId of uniqueSources) {
    const sourceContainer = await getAddonContainerForCategory(sourceId);
    if (!sourceContainer) continue;
    sourceAddonIds.push(sourceContainer.id);
    mergedOptions = dedupeAddonOptions([...mergedOptions, ...sourceContainer.options]);
  }

  const { error: optErr } = await supabase
    .from("addons")
    .update({ options: mergedOptions, updated_at: new Date().toISOString() })
    .eq("id", targetContainer.id);
  if (optErr) {
    return { ok: false, error: optErr.message };
  }

  for (const oldAddonId of sourceAddonIds) {
    const { data: links } = await supabase
      .from("product_addons")
      .select("product_id")
      .eq("addon_id", oldAddonId);
    for (const row of links ?? []) {
      const productId = String((row as { product_id: string }).product_id);
      const { data: existing } = await supabase
        .from("product_addons")
        .select("addon_id")
        .eq("product_id", productId)
        .eq("addon_id", targetContainer.id)
        .maybeSingle();
      if (!existing) {
        await supabase.from("product_addons").insert({
          product_id: productId,
          addon_id: targetContainer.id,
        });
      }
      await supabase
        .from("product_addons")
        .delete()
        .eq("product_id", productId)
        .eq("addon_id", oldAddonId);
    }
    await supabase.from("addons").delete().eq("id", oldAddonId);
  }

  for (const sourceId of uniqueSources) {
    await supabase.from("addon_categories").delete().eq("id", sourceId);
  }

  const rows = await listAddonCategoriesWithItems();
  const category = rows.find((c) => c.id === targetId);
  if (!category) return { ok: false, error: "Merge completed but category not found." };
  return { ok: true, category };
}

export async function deleteAddonCategory(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdminClient();
  const container = await getAddonContainerForCategory(id);
  if (container) {
    const { count } = await supabase
      .from("product_addons")
      .select("product_id", { count: "exact", head: true })
      .eq("addon_id", container.id);
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error: "Category is linked to products. Unlink it first. / التصنيف مربوط بمنتجات — ألغِ الربط أولاً.",
      };
    }
    await supabase.from("addons").delete().eq("id", container.id);
  }
  const { error } = await supabase.from("addon_categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** يطبّق أسماء التصنيفات على سجلات addons للعرض في المتجر */
export async function enrichAddonsWithCategories(addons: Addon[]): Promise<Addon[]> {
  if (addons.length === 0) return [];
  const categories = await listAddonCategoriesWithItems();
  const byCategoryId = new Map(categories.map((c) => [c.id, c]));
  const byAddonId = new Map(
    categories.filter((c) => c.addon_id).map((c) => [c.addon_id!, c]),
  );
  return addons.map((addon) => {
    const cat =
      (addon.category_id ? byCategoryId.get(addon.category_id) : null) ??
      byAddonId.get(addon.id);
    if (!cat) return addon;
    const enriched = categoryToStorefrontAddon(cat, addon);
    return enriched ?? addon;
  });
}
