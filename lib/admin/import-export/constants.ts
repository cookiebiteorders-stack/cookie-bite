export const IMPORT_EXPORT_STORAGE_BUCKET = "admin-imports";

export const MAX_IMPORT_FILE_BYTES = 12 * 1024 * 1024;
export const MAX_IMPORT_ROWS_DEFAULT = 500;
export const BULK_INSERT_CHUNK = 50;

export const ALLOWED_IMPORT_EXTENSIONS = [".csv", ".xlsx", ".pdf"] as const;
export const ALLOWED_IMPORT_MIME = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/pdf",
] as const;

export const EXPORT_MIME: Record<string, string> = {
  csv: "text/csv;charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};
