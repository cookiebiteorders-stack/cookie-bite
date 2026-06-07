import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportCommitResult } from "@/lib/admin/import-export/types";
import { BULK_INSERT_CHUNK } from "@/lib/admin/import-export/constants";
import { insertProductWithSlugRetry } from "@/lib/products/insert-product";

function buildCreateRow(row: Record<string, unknown>, slug: string) {
  const name = String(row.name ?? "").trim();
  const price = Number(row.price_egp);
  return {
    slug,
    name,
    title_en: row.title_en != null ? String(row.title_en).slice(0, 160) : null,
    title_ar: row.title_ar != null ? String(row.title_ar).slice(0, 160) : null,
    description_en: null,
    description_ar: null,
    description: null,
    category: row.category != null ? String(row.category).slice(0, 100) : null,
    sku: row.sku != null && String(row.sku).trim() ? String(row.sku).trim().slice(0, 80) : null,
    price_egp: price,
    compare_price_egp: null,
    stock: row.stock != null ? Math.max(0, Math.floor(Number(row.stock))) : 0,
    is_active: row.is_active !== undefined ? Boolean(row.is_active) : false,
    image_url: null,
    images: [],
    video_url: null,
    badges: [],
    seasons: [],
    weight_grams: null,
    pieces_count: null,
    dietary: [],
  };
}

export async function commitProductsImport(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
): Promise<Pick<ImportCommitResult, "successRows" | "failedRows" | "failures">> {
  let successRows = 0;
  let failedRows = 0;
  const failures: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i += BULK_INSERT_CHUNK) {
    const chunk = rows.slice(i, i + BULK_INSERT_CHUNK);
    await Promise.all(
      chunk.map(async (row, offset) => {
        const rowIndex = i + offset + 2;
        const id = row.id != null ? String(row.id).trim() : "";
        const { id: _ignored, ...patch } = row as { id?: string } & Record<string, unknown>;

        if (id) {
          const clean = Object.fromEntries(
            Object.entries(patch).filter(([, v]) => v !== undefined),
          );
          if (Object.keys(clean).length === 0) return;

          const { error } = await supabase.from("products").update(clean).eq("id", id);
          if (error) {
            failedRows += 1;
            failures.push({ row: rowIndex, message: error.message });
          } else {
            successRows += 1;
          }
          return;
        }

        const name = String(row.name ?? "").trim();
        const price = Number(row.price_egp);
        if (!name || name.length < 2) {
          failedRows += 1;
          failures.push({ row: rowIndex, message: "name مطلوب لإنشاء منتج جديد" });
          return;
        }
        if (!Number.isFinite(price) || price <= 0) {
          failedRows += 1;
          failures.push({ row: rowIndex, message: "price_egp مطلوب ويجب أن يكون > 0" });
          return;
        }

        const explicitSlug =
          row.slug != null && String(row.slug).trim().length >= 2
            ? String(row.slug).trim()
            : undefined;

        const inserted = await insertProductWithSlugRetry(
          supabase,
          name,
          explicitSlug,
          (slug) => buildCreateRow(row, slug),
        );

        if ("error" in inserted) {
          failedRows += 1;
          failures.push({
            row: rowIndex,
            message: inserted.error?.message ?? "فشل إنشاء المنتج",
          });
        } else {
          successRows += 1;
        }
      }),
    );
  }

  return { successRows, failedRows, failures };
}
