import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportCommitResult } from "@/lib/admin/import-export/types";
import { BULK_INSERT_CHUNK } from "@/lib/admin/import-export/constants";

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
        const { id, ...patch } = row as { id: string } & Record<string, unknown>;
        const clean = Object.fromEntries(
          Object.entries(patch).filter(([, v]) => v !== undefined),
        );
        if (!id || Object.keys(clean).length === 0) return;

        const { error } = await supabase.from("products").update(clean).eq("id", id);
        if (error) {
          failedRows += 1;
          failures.push({ row: rowIndex, message: error.message });
        } else {
          successRows += 1;
        }
      }),
    );
  }

  return { successRows, failedRows, failures };
}
