import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActor } from "@/lib/admin/audit";

export type ProductVersionRow = {
  id: string;
  product_id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  reason: string | null;
  audit_log_id: string | null;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
};

const RESTORE_SKIP_KEYS = new Set(["id", "created_at", "updated_at"]);

export function pickProductRestorePatch(
  snapshot: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(snapshot)) {
    if (RESTORE_SKIP_KEYS.has(key)) continue;
    patch[key] = value;
  }
  return patch;
}

export async function saveProductVersions(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
  actor: AuditActor,
  reason: string,
  auditLogId?: string | null,
): Promise<void> {
  if (rows.length === 0) return;

  const productIds = rows.map((r) => String(r.id));
  const { data: existing } = await supabase
    .from("product_versions")
    .select("product_id, version_number")
    .in("product_id", productIds);

  const maxByProduct = new Map<string, number>();
  for (const row of existing ?? []) {
    const pid = String(row.product_id);
    const n = Number(row.version_number ?? 0);
    maxByProduct.set(pid, Math.max(maxByProduct.get(pid) ?? 0, n));
  }

  const inserts = rows.map((row) => {
    const productId = String(row.id);
    const next = (maxByProduct.get(productId) ?? 0) + 1;
    maxByProduct.set(productId, next);
    return {
      product_id: productId,
      version_number: next,
      snapshot: row,
      reason,
      audit_log_id: auditLogId ?? null,
      created_by: actor.user_id,
      created_by_email: actor.email,
    };
  });

  const { error } = await supabase.from("product_versions").insert(inserts);
  if (error) throw error;
}

export async function listProductVersions(
  supabase: SupabaseClient,
  productId: string,
  limit = 20,
): Promise<ProductVersionRow[]> {
  const { data, error } = await supabase
    .from("product_versions")
    .select("*")
    .eq("product_id", productId)
    .order("version_number", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ProductVersionRow[];
}

export async function restoreProductVersion(
  supabase: SupabaseClient,
  productId: string,
  versionId: string,
): Promise<{ product: Record<string, unknown>; version: ProductVersionRow }> {
  const { data: version, error: vErr } = await supabase
    .from("product_versions")
    .select("*")
    .eq("id", versionId)
    .eq("product_id", productId)
    .maybeSingle();
  if (vErr) throw vErr;
  if (!version) throw new Error("version_not_found");

  const snapshot = version.snapshot as Record<string, unknown>;
  const patch = pickProductRestorePatch(snapshot);

  const { data: product, error: uErr } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    .select("*")
    .single();
  if (uErr) throw uErr;

  return { product: product as Record<string, unknown>, version: version as ProductVersionRow };
}

export async function restoreProductFromAuditBefore(
  supabase: SupabaseClient,
  productId: string,
  beforeRow: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const patch = pickProductRestorePatch(beforeRow);
  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Record<string, unknown>;
}
