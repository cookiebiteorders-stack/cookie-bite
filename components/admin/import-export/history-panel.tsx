"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { ModuleKey } from "@/lib/admin/rbac";
import { useImportExport } from "@/hooks/use-import-export";
import { ImportExportStatusBadge } from "@/components/admin/import-export/status-badge";

type LogRow = {
  id: string;
  module: string;
  status: string;
  file_name?: string;
  format?: string;
  row_count?: number;
  total_rows?: number;
  success_rows?: number;
  failed_rows?: number;
  created_at: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  module: ModuleKey;
};

export function ImportExportHistoryPanel({ open, onClose, module }: Props) {
  const { fetchImportHistory, fetchExportHistory } = useImportExport(module);
  const [imports, setImports] = useState<LogRow[]>([]);
  const [exports, setExports] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"import" | "export">("import");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([fetchImportHistory(), fetchExportHistory()])
      .then(([imp, exp]) => {
        setImports((imp.rows ?? []) as LogRow[]);
        setExports((exp.rows ?? []) as LogRow[]);
      })
      .finally(() => setLoading(false));
  }, [open, fetchImportHistory, fetchExportHistory]);

  if (!open) return null;

  const rows = tab === "import" ? imports : exports;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="إغلاق" onClick={onClose} />
      <div
        role="dialog"
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-cb-border bg-cb-surface-elevated shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-cb-border px-4 py-3">
          <h2 className="text-sm font-bold">سجل الاستيراد / التصدير</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-cb-surface">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="flex gap-1 border-b border-cb-border px-4 pt-2">
          {(["import", "export"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? "border-b-2 border-cb-brand-500 px-3 py-2 text-xs font-bold text-cb-brand-800"
                  : "px-3 py-2 text-xs font-semibold text-cb-text-muted"
              }
            >
              {t === "import" ? "استيراد" : "تصدير"}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-cb-brand-600" aria-hidden />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-xs text-cb-text-muted">لا توجد سجلات بعد</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-cb-border px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <ImportExportStatusBadge status={r.status} />
                    <time className="text-[10px] text-cb-text-muted">
                      {new Date(r.created_at).toLocaleString("ar-EG")}
                    </time>
                  </div>
                  <p className="mt-1 font-semibold text-cb-text-strong">
                    {r.file_name ?? r.format ?? "—"}
                  </p>
                  {tab === "import" ? (
                    <p className="text-cb-text-muted">
                      {r.success_rows ?? 0} نجاح · {r.failed_rows ?? 0} فشل · {r.total_rows ?? 0} إجمالي
                    </p>
                  ) : (
                    <p className="text-cb-text-muted">{r.row_count ?? 0} صف</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
