import type { ModuleKey } from "@/lib/admin/rbac";

export type ImportExportModule = ModuleKey;

export type ImportFileType = "csv" | "xlsx" | "pdf";
export type ExportFormat = "csv" | "xlsx" | "pdf";
export type ExportScope = "all" | "filtered" | "selected";

export type ParsedSheet = {
  headers: string[];
  rows: Record<string, string>[];
};

export type ValidationIssue = {
  row: number;
  field?: string;
  message: string;
};

export type ImportPreviewResult = {
  headers: string[];
  rows: Record<string, string>[];
  mappedRows: Record<string, unknown>[];
  issues: ValidationIssue[];
  duplicates: number[];
};

export type ImportCommitResult = {
  logId: string;
  status: "completed" | "partial" | "failed";
  successRows: number;
  failedRows: number;
  duplicateRows: number;
  failures: Array<{ row: number; message: string }>;
};

export type ExportResult = {
  logId: string;
  format: ExportFormat;
  rowCount: number;
  fileName: string;
  mimeType: string;
  /** Base64 for JSON API responses */
  dataBase64?: string;
  downloadUrl?: string;
};

export type ColumnDef = {
  key: string;
  label: string;
  required?: boolean;
};

export type ColumnMapping = Record<string, string>;

export type ModuleImportExportConfig = {
  module: ImportExportModule;
  label: string;
  table?: string;
  importEnabled: boolean;
  exportEnabled: boolean;
  templateColumns: ColumnDef[];
  /** DB column keys for export */
  exportColumns: string[];
  maxImportRows: number;
};
