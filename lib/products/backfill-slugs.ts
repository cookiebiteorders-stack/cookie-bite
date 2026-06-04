import type { SupabaseClient } from "@supabase/supabase-js";
import { appendSlugSuffix, deriveProductSlug } from "@/lib/products/slug";

type ProductSlugRow = { id: string; name: string; slug: string | null };

function needsSlug(slug: string | null | undefined): boolean {
  return !slug?.trim();
}

/**
 * يملأ slug الناقص لكل المنتجات — ضروري لروابط /shop/[slug] التلقائية.
 */
export async function backfillMissingProductSlugs(
  supabase: SupabaseClient,
  maxRows = 500,
): Promise<{ updated: number; skipped: number; errors: string[] }> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug")
    .limit(maxRows);

  if (error) {
    return { updated: 0, skipped: 0, errors: [error.message] };
  }

  const rows = ((data as ProductSlugRow[] | null) ?? []).filter((r) =>
    needsSlug(r.slug),
  );
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!needsSlug(row.slug)) {
      skipped += 1;
      continue;
    }
    const name = row.name?.trim() || "product";
    const base = deriveProductSlug(name);
    let saved = false;

    for (let attempt = 1; attempt <= 8; attempt++) {
      const slug = appendSlugSuffix(base, attempt);
      const { error: upErr } = await supabase
        .from("products")
        .update({ slug })
        .eq("id", row.id);

      if (!upErr) {
        updated += 1;
        saved = true;
        break;
      }
      if (String(upErr.code ?? "") !== "23505") {
        errors.push(`${row.id}: ${upErr.message}`);
        break;
      }
    }

    if (!saved && !errors.some((e) => e.startsWith(row.id))) {
      errors.push(`${row.id}: could not assign slug`);
    }
  }

  return { updated, skipped, errors };
}
