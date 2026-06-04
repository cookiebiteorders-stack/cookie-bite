import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportCommitResult } from "@/lib/admin/import-export/types";

export async function commitDiscountsImport(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
): Promise<Pick<ImportCommitResult, "successRows" | "failedRows" | "failures">> {
  let successRows = 0;
  let failedRows = 0;
  const failures: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const code = String(row.code ?? "")
      .trim()
      .toUpperCase();
    const type = String(row.type ?? row.discount_type ?? "percent").trim().toLowerCase();
    const value = Number(row.value ?? row.discount_value);

    if (!code || code.length < 3) {
      failedRows += 1;
      failures.push({ row: i + 2, message: "كود الخصم مطلوب (3 أحرف على الأقل)" });
      continue;
    }
    if (type !== "percent" && type !== "fixed") {
      failedRows += 1;
      failures.push({ row: i + 2, message: "النوع يجب أن يكون percent أو fixed" });
      continue;
    }
    if (!Number.isFinite(value) || value <= 0) {
      failedRows += 1;
      failures.push({ row: i + 2, message: "قيمة الخصم غير صالحة" });
      continue;
    }

    const { data: existing } = await supabase.from("promo_codes").select("id").eq("code", code).maybeSingle();

    const payload = {
      code,
      type,
      value,
      min_order_amount_egp: Number(row.min_order_amount_egp) || 0,
      max_uses:
        row.max_uses != null && String(row.max_uses).trim() !== "" ? Number(row.max_uses) : null,
      is_active: row.is_active == null ? true : String(row.is_active).toLowerCase() !== "false",
      metadata: { kind: type, campaign_tag: "import" },
    };

    const { error } = existing
      ? await supabase.from("promo_codes").update(payload).eq("id", existing.id)
      : await supabase.from("promo_codes").insert(payload);

    if (error) {
      failedRows += 1;
      failures.push({ row: i + 2, message: error.message });
    } else {
      successRows += 1;
    }
  }

  return { successRows, failedRows, failures };
}
