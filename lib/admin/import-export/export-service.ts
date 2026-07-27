import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminActor } from "@/lib/admin/require-admin";
import { getModuleConfig } from "@/lib/admin/import-export/module-registry";
import { buildExportFile } from "@/lib/admin/import-export/export-builder";
import type { ExportFormat, ExportResult, ExportScope } from "@/lib/admin/import-export/types";
import type { ModuleKey } from "@/lib/admin/rbac";
import { writeAuditLog } from "@/lib/admin/audit";

export type ExportQueryParams = {
  format: ExportFormat;
  scope: ExportScope;
  ids?: string[];
  dateFrom?: string;
  dateTo?: string;
  filters?: Record<string, string>;
  limit?: number;
};

async function fetchModuleRows(
  module: ModuleKey,
  params: ExportQueryParams,
): Promise<Record<string, unknown>[]> {
  const config = getModuleConfig(module);
  if (!config?.exportEnabled || !config.table) {
    throw new Error("التصدير غير مفعّل لهذه الوحدة");
  }

  const supabase = createSupabaseAdminClient();
  const cols = config.exportColumns.join(",");
  let q = supabase.from(config.table).select(cols);

  if (module === "customers") {
    q = q.eq("role", "customer");
  }

  if (params.scope === "selected" && params.ids?.length) {
    q = q.in("id", params.ids);
  }

  const dateCol = config.exportColumns.includes("created_at") ? "created_at" : null;
  if (dateCol && params.dateFrom) q = q.gte(dateCol, params.dateFrom);
  if (dateCol && params.dateTo) q = q.lte(dateCol, params.dateTo);

  if (params.filters) {
    for (const [key, val] of Object.entries(params.filters)) {
      if (val && config.exportColumns.includes(key)) {
        q = q.eq(key, val);
      }
    }
  }

  const cap = params.scope === "all" ? 5000 : params.limit ?? 2000;
  q = q.order("created_at", { ascending: false }).limit(cap);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Record<string, unknown>[];
}

export async function exportModuleData(params: {
  module: ModuleKey;
  actor: AdminActor;
  query: ExportQueryParams;
  request?: Request;
}): Promise<ExportResult & { buffer: Buffer; mimeType: string }> {
  const config = getModuleConfig(params.module);
  if (!config?.exportEnabled) throw new Error("التصدير غير مفعّل لهذه الوحدة");

  const rows = await fetchModuleRows(params.module, params.query);
  const { buffer, mimeType, fileName } = await buildExportFile(
    params.query.format,
    config.label,
    config.exportColumns,
    rows,
  );

  const supabase = createSupabaseAdminClient();
  const { data: logRow } = await supabase
    .from("export_logs")
    .insert({
      module: params.module,
      format: params.query.format,
      scope: params.query.scope,
      row_count: rows.length,
      filters: {
        dateFrom: params.query.dateFrom,
        dateTo: params.query.dateTo,
        ids: params.query.ids,
        ...params.query.filters,
      },
      status: "completed",
      created_by: params.actor.user_id,
      created_by_user: params.actor.supabase_user_id,
    })
    .select("id")
    .single();

  const logId = (logRow?.id as string) ?? "";

  await writeAuditLog({
    actor: {
      user_id: params.actor.user_id,
      email: params.actor.email,
      role: params.actor.role,
    },
    action: `${params.module}.export`,
    module: params.module,
    metadata: { logId, format: params.query.format, rowCount: rows.length },
    request: params.request,
  });

  return {
    logId,
    format: params.query.format,
    rowCount: rows.length,
    fileName,
    mimeType,
    dataBase64: buffer.toString("base64"),
    buffer,
  };
}

export function buildTemplateCsv(config: ReturnType<typeof getModuleConfig>): string {
  if (!config) return "";
  const headers = config.templateColumns.map((c) => c.key);
  const sample = config.templateColumns.map((c) => (c.required ? `(${c.label})` : ""));
  return [headers.join(","), sample.join(",")].join("\n");
}

export async function listExportHistory(module?: string, limit = 30) {
  const supabase = createSupabaseAdminClient();
  let q = supabase
    .from("export_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (module) q = q.eq("module", module);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}
