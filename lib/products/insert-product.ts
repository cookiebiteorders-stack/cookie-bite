import type { SupabaseClient } from "@supabase/supabase-js";
import { appendSlugSuffix, deriveProductSlug } from "@/lib/products/slug";

export type ProductInsertRow = Record<string, unknown>;

/**
 * Inserts a product row with slug collision retries (Postgres 23505).
 */
export async function insertProductWithSlugRetry(
  supabase: SupabaseClient,
  name: string,
  explicitSlug: string | undefined,
  buildRow: (slug: string) => ProductInsertRow,
  maxAttempts = 8,
): Promise<{ data: Record<string, unknown>; slug: string } | { error: { code?: string; message?: string } }> {
  const baseSlug = deriveProductSlug(name, explicitSlug?.trim());

  let lastError: { code?: string; message?: string } | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const slug = appendSlugSuffix(baseSlug, attempt);
    const row = buildRow(slug);
    const result = await supabase.from("products").insert(row).select("*").single();
    if (!result.error && result.data) {
      return { data: result.data as Record<string, unknown>, slug };
    }
    lastError = result.error;
    const code = String(result.error?.code ?? "");
    if (code !== "23505") break;
  }

  return { error: lastError ?? { message: "insert failed" } };
}
