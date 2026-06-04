import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportCommitResult } from "@/lib/admin/import-export/types";

export async function commitOrdersImport(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
): Promise<Pick<ImportCommitResult, "successRows" | "failedRows" | "failures">> {
  let successRows = 0;
  let failedRows = 0;
  const failures: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const id = String(row.id ?? "").trim();
    if (!id) {
      failedRows += 1;
      failures.push({ row: i + 2, message: "معرّف الطلب (id) مطلوب" });
      continue;
    }

    const patch: Record<string, unknown> = {};
    if (row.status != null && String(row.status).trim()) {
      patch.status = String(row.status).trim();
    }
    if (row.payment_status != null && String(row.payment_status).trim()) {
      patch.payment_status = String(row.payment_status).trim();
    }

    if (Object.keys(patch).length === 0) {
      failedRows += 1;
      failures.push({ row: i + 2, message: "أضف status و/أو payment_status للتحديث" });
      continue;
    }

    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) {
      failedRows += 1;
      failures.push({ row: i + 2, message: error.message });
      continue;
    }
    successRows += 1;
  }

  return { successRows, failedRows, failures };
}
