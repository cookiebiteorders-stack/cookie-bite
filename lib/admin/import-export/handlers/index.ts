import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportCommitResult } from "@/lib/admin/import-export/types";
import type { ModuleKey } from "@/lib/admin/rbac";
import { commitProductsImport } from "@/lib/admin/import-export/handlers/products";
import { BULK_INSERT_CHUNK } from "@/lib/admin/import-export/constants";

export type ImportHandler = (
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
) => Promise<Pick<ImportCommitResult, "successRows" | "failedRows" | "failures">>;

async function genericInsert(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
): Promise<Pick<ImportCommitResult, "successRows" | "failedRows" | "failures">> {
  let successRows = 0;
  let failedRows = 0;
  const failures: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i += BULK_INSERT_CHUNK) {
    const chunk = rows.slice(i, i + BULK_INSERT_CHUNK);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      chunk.forEach((_, offset) => {
        failedRows += 1;
        failures.push({ row: i + offset + 2, message: error.message });
      });
    } else {
      successRows += chunk.length;
    }
  }
  return { successRows, failedRows, failures };
}

const HANDLERS: Partial<Record<ModuleKey, ImportHandler>> = {
  products: commitProductsImport,
  discounts: (sb, rows) => genericInsert(sb, "promo_codes", rows),
  financial: (sb, rows) => genericInsert(sb, "expenses", rows),
  shipping: (sb, rows) => genericInsert(sb, "shipping_zones", rows),
};

export function getImportHandler(module: ModuleKey): ImportHandler | null {
  return HANDLERS[module] ?? null;
}
