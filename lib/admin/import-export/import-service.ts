import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminActor } from "@/lib/admin/require-admin";
import { getModuleConfig } from "@/lib/admin/import-export/module-registry";
import {
  applyColumnMapping,
  suggestColumnMapping,
  type ColumnMapping,
} from "@/lib/admin/import-export/column-mapper";
import {
  detectFileType,
  parseImportBuffer,
} from "@/lib/admin/import-export/file-parser";
import { validateMappedRows } from "@/lib/admin/import-export/validation-engine";
import { getImportHandler } from "@/lib/admin/import-export/handlers";
import { uploadImportFile } from "@/lib/admin/import-export/storage";
import {
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS_DEFAULT,
} from "@/lib/admin/import-export/constants";
import type {
  ImportCommitResult,
  ImportPreviewResult,
  ImportFileType,
} from "@/lib/admin/import-export/types";
import type { ModuleKey } from "@/lib/admin/rbac";
import { writeAuditLog } from "@/lib/admin/audit";

export async function previewModuleImport(params: {
  module: ModuleKey;
  fileName: string;
  mimeType: string | null;
  buffer: Buffer;
  mapping?: ColumnMapping;
}): Promise<ImportPreviewResult & { suggestedMapping: ColumnMapping; fileType: ImportFileType }> {
  const config = getModuleConfig(params.module);
  if (!config?.importEnabled) {
    throw new Error("الاستيراد غير مفعّل لهذه الوحدة");
  }
  if (params.buffer.length > MAX_IMPORT_FILE_BYTES) {
    throw new Error("حجم الملف يتجاوز الحد المسموح (12MB)");
  }

  const fileType = detectFileType(params.fileName, params.mimeType);
  if (!fileType) throw new Error("نوع ملف غير مدعوم");

  const sheet = await parseImportBuffer(params.buffer, fileType);
  const maxRows = config.maxImportRows || MAX_IMPORT_ROWS_DEFAULT;
  const trimmed = sheet.rows.slice(0, maxRows);

  const suggestedMapping =
    params.mapping && Object.keys(params.mapping).length
      ? params.mapping
      : suggestColumnMapping(sheet.headers, config.templateColumns);

  const mappedStrings = applyColumnMapping(trimmed, suggestedMapping);
  const { validRows, issues, duplicates } = validateMappedRows(
    params.module,
    mappedStrings,
    config.templateColumns,
  );

  return {
    headers: sheet.headers,
    rows: trimmed,
    mappedRows: validRows,
    issues,
    duplicates,
    suggestedMapping,
    fileType,
  };
}

export async function commitModuleImport(params: {
  module: ModuleKey;
  actor: AdminActor;
  fileName: string;
  mimeType: string | null;
  buffer: Buffer;
  mapping: ColumnMapping;
  request?: Request;
}): Promise<ImportCommitResult> {
  const config = getModuleConfig(params.module);
  if (!config?.importEnabled) throw new Error("الاستيراد غير مفعّل لهذه الوحدة");

  const handler = getImportHandler(params.module);
  if (!handler) throw new Error("لا يوجد معالج استيراد لهذه الوحدة");

  const preview = await previewModuleImport({
    module: params.module,
    fileName: params.fileName,
    mimeType: params.mimeType,
    buffer: params.buffer,
    mapping: params.mapping,
  });

  const supabase = createSupabaseAdminClient();
  const { data: logRow, error: logErr } = await supabase
    .from("import_logs")
    .insert({
      module: params.module,
      file_name: params.fileName,
      file_type: preview.fileType,
      status: "processing",
      total_rows: preview.rows.length,
      created_by: params.actor.user_id,
      created_by_user: params.actor.supabase_user_id,
      metadata: { mapping: params.mapping },
    })
    .select("id")
    .single();

  if (logErr || !logRow?.id) {
    throw new Error(logErr?.message ?? "تعذّر إنشاء سجل الاستيراد");
  }

  const logId = logRow.id as string;
  const storagePath = await uploadImportFile({
    module: params.module,
    logId,
    fileName: params.fileName,
    buffer: params.buffer,
    contentType: params.mimeType ?? "application/octet-stream",
  });

  if (storagePath) {
    await supabase.from("import_logs").update({ storage_path: storagePath }).eq("id", logId);
  }

  const { successRows, failedRows, failures } = await handler(supabase, preview.mappedRows);

  const duplicateRows = preview.duplicates.length;
  const status =
    failedRows === 0 && preview.issues.length === 0
      ? "completed"
      : successRows > 0
        ? "partial"
        : "failed";

  if (failures.length) {
    await supabase.from("failed_imports").insert(
      failures.map((f) => ({
        import_log_id: logId,
        row_number: f.row,
        row_data: {},
        error_message: f.message,
      })),
    );
  }

  await supabase
    .from("import_logs")
    .update({
      status,
      success_rows: successRows,
      failed_rows: failedRows + preview.issues.length,
      duplicate_rows: duplicateRows,
      error_summary:
        failures[0]?.message ?? preview.issues[0]?.message ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", logId);

  await writeAuditLog({
    actor: {
      user_id: params.actor.user_id,
      email: params.actor.email,
      role: params.actor.role,
    },
    action: `${params.module}.import`,
    module: params.module,
    metadata: { logId, successRows, failedRows, duplicateRows },
    request: params.request,
  });

  return {
    logId,
    status: status as ImportCommitResult["status"],
    successRows,
    failedRows: failedRows + preview.issues.length,
    duplicateRows,
    failures: [
      ...preview.issues.map((i) => ({ row: i.row, message: i.message })),
      ...failures,
    ],
  };
}

export async function listImportHistory(module?: string, limit = 30) {
  const supabase = createSupabaseAdminClient();
  let q = supabase
    .from("import_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (module) q = q.eq("module", module);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}
