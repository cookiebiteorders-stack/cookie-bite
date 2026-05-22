"use client";

import { useCallback, useState } from "react";
import type { ModuleKey } from "@/lib/admin/rbac";
import type {
  ColumnMapping,
  ExportFormat,
  ExportScope,
  ImportPreviewResult,
} from "@/lib/admin/import-export/types";
import { fetchJson } from "@/lib/http/fetch-json";

export function useImportExport(module: ModuleKey) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewImport = useCallback(
    async (file: File, mapping?: ColumnMapping): Promise<ImportPreviewResult & { suggestedMapping: ColumnMapping; fileType: string }> => {
      setLoading(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("file", file);
        if (mapping && Object.keys(mapping).length) {
          form.append("mapping", JSON.stringify(mapping));
        }
        const res = await fetch(`/api/admin/import-export/${module}/preview`, {
          method: "POST",
          body: form,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.ar ?? json?.error?.en ?? "فشل المعاينة");
        return json;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "فشل المعاينة";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [module],
  );

  const commitImport = useCallback(
    async (file: File, mapping: ColumnMapping) => {
      setLoading(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("mapping", JSON.stringify(mapping));
        const res = await fetch(`/api/admin/import-export/${module}/import`, {
          method: "POST",
          body: form,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.ar ?? json?.error?.en ?? "فشل الاستيراد");
        return json;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "فشل الاستيراد";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [module],
  );

  const downloadExport = useCallback(
    async (opts: {
      format: ExportFormat;
      scope: ExportScope;
      ids?: string[];
      dateFrom?: string;
      dateTo?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const q = new URLSearchParams({
          format: opts.format,
          scope: opts.scope,
          download: "1",
        });
        if (opts.ids?.length) q.set("ids", opts.ids.join(","));
        if (opts.dateFrom) q.set("dateFrom", opts.dateFrom);
        if (opts.dateTo) q.set("dateTo", opts.dateTo);
        const res = await fetch(`/api/admin/import-export/${module}/export?${q}`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error?.ar ?? json?.error?.en ?? "فشل التصدير");
        }
        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition");
        const nameMatch = cd?.match(/filename="([^"]+)"/);
        const fileName = nameMatch?.[1] ?? `${module}-export.${opts.format}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return { rowCount: res.headers.get("X-Row-Count") };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "فشل التصدير";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [module],
  );

  const downloadTemplate = useCallback(() => {
    window.open(`/api/admin/import-export/${module}/template`, "_blank");
  }, [module]);

  const fetchImportHistory = useCallback(async () => {
    return fetchJson<{ rows: unknown[] }>(
      `/api/admin/import-export/import/history?module=${module}`,
    );
  }, [module]);

  const fetchExportHistory = useCallback(async () => {
    return fetchJson<{ rows: unknown[] }>(
      `/api/admin/import-export/export/history?module=${module}`,
    );
  }, [module]);

  return {
    loading,
    error,
    setError,
    previewImport,
    commitImport,
    downloadExport,
    downloadTemplate,
    fetchImportHistory,
    fetchExportHistory,
  };
}
