"use client";

import { useState } from "react";
import { X, Loader2, Download } from "lucide-react";
import type { ModuleKey } from "@/lib/admin/rbac";
import type { ExportFormat, ExportScope } from "@/lib/admin/import-export/types";
import { MODULE_IMPORT_EXPORT_REGISTRY } from "@/lib/admin/import-export/module-registry";
import { useImportExport } from "@/hooks/use-import-export";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  module: ModuleKey;
  selectedIds?: string[];
  defaultScope?: ExportScope;
};

export function ExportModal({
  open,
  onClose,
  module,
  selectedIds = [],
  defaultScope = "filtered",
}: Props) {
  const config = MODULE_IMPORT_EXPORT_REGISTRY[module];
  const { loading, downloadExport } = useImportExport(module);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [scope, setScope] = useState<ExportScope>(
    selectedIds.length ? "selected" : defaultScope,
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  if (!open || !config.exportEnabled) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="إغلاق" onClick={onClose} />
      <div
        role="dialog"
        aria-labelledby="export-modal-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-2xl"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 id="export-modal-title" className="text-sm font-bold text-cb-text-strong">
            تصدير — {config.label}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-cb-surface">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="space-y-3 text-xs">
          <fieldset>
            <legend className="mb-1 font-bold text-cb-text-muted">الصيغة</legend>
            <div className="flex flex-wrap gap-2">
              {(["csv", "xlsx", "pdf"] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 font-bold uppercase",
                    format === f
                      ? "border-cb-brand-500 bg-cb-brand-50 text-cb-brand-800"
                      : "border-cb-border",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1 font-bold text-cb-text-muted">النطاق</legend>
            <select
              className="w-full rounded-lg border border-cb-border bg-cb-surface px-2 py-2"
              value={scope}
              onChange={(e) => setScope(e.target.value as ExportScope)}
            >
              <option value="filtered">البيانات المفلترة (حتى 2000)</option>
              <option value="all">كل السجلات (حتى 5000)</option>
              {selectedIds.length > 0 ? (
                <option value="selected">المحدد ({selectedIds.length})</option>
              ) : null}
            </select>
          </fieldset>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-0.5">
              <span className="font-semibold text-cb-text-muted">من تاريخ</span>
              <input
                type="date"
                className="rounded-lg border border-cb-border px-2 py-1.5"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="font-semibold text-cb-text-muted">إلى تاريخ</span>
              <input
                type="date"
                className="rounded-lg border border-cb-border px-2 py-1.5"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
          </div>
        </div>

        <footer className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="admin-btn-secondary rounded-lg px-3 py-2 text-xs font-bold">
            إلغاء
          </button>
          <button
            type="button"
            disabled={loading}
            className="admin-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-50"
            onClick={async () => {
              await downloadExport({
                format,
                scope,
                ids: scope === "selected" ? selectedIds : undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
              });
              onClose();
            }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            تنزيل
          </button>
        </footer>
      </div>
    </div>
  );
}
