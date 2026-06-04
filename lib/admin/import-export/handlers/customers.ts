import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportCommitResult } from "@/lib/admin/import-export/types";

export async function commitCustomersImport(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
): Promise<Pick<ImportCommitResult, "successRows" | "failedRows" | "failures">> {
  let successRows = 0;
  let failedRows = 0;
  const failures: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const email = String(row.email ?? "")
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@")) {
      failedRows += 1;
      failures.push({ row: i + 2, message: "البريد الإلكتروني مطلوب وصالح" });
      continue;
    }

    const full_name = String(row.full_name ?? row.name ?? "").trim() || null;
    const phone = String(row.phone ?? "").trim() || null;
    const pointsRaw = row.points;
    const points =
      pointsRaw != null && String(pointsRaw).trim() !== ""
        ? Math.max(0, Math.floor(Number(pointsRaw)) || 0)
        : 0;

    const { data: existing } = await supabase
      .from("users")
      .select("id,role")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      if (existing.role !== "customer") {
        failedRows += 1;
        failures.push({ row: i + 2, message: "البريد مرتبط بحساب غير عميل" });
        continue;
      }
      const patch: Record<string, unknown> = {};
      if (full_name) patch.full_name = full_name;
      if (phone) patch.phone = phone;
      if (points > 0) patch.points = points;
      if (Object.keys(patch).length === 0) {
        successRows += 1;
        continue;
      }
      const { error } = await supabase.from("users").update(patch).eq("id", existing.id);
      if (error) {
        failedRows += 1;
        failures.push({ row: i + 2, message: error.message });
      } else {
        successRows += 1;
      }
      continue;
    }

    const { error } = await supabase.from("users").insert({
      clerk_user_id: `crm-import:${randomUUID()}`,
      email,
      full_name,
      phone,
      points,
      role: "customer",
    });

    if (error) {
      failedRows += 1;
      failures.push({ row: i + 2, message: error.message });
    } else {
      successRows += 1;
    }
  }

  return { successRows, failedRows, failures };
}
