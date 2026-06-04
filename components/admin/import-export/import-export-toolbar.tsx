"use client";

import { useState } from "react";
import { Download, Upload, History } from "lucide-react";
import type { ModuleKey } from "@/lib/admin/rbac";
import { MODULE_IMPORT_EXPORT_REGISTRY } from "@/lib/admin/import-export/module-registry";
import { ImportModal } from "@/components/admin/import-export/import-modal";
import { ExportModal } from "@/components/admin/import-export/export-modal";
import { ImportExportHistoryPanel } from "@/components/admin/import-export/history-panel";
import { cn } from "@/lib/utils";

type Props = {
  module: ModuleKey;
  canWrite?: boolean;
  selectedIds?: string[];
  onImportSuccess?: () => void;
  className?: string;
  size?: "sm" | "md";
  /** Override button classes (e.g. admin-btn-outline on orders toolbar) */
  buttonClassName?: string;
  showHistory?: boolean;
};

export function ImportExportToolbar({
  module,
  canWrite = true,
  selectedIds = [],
  onImportSuccess,
  className,
  size = "sm",
  buttonClassName,
  showHistory = true,
}: Props) {
  const config = MODULE_IMPORT_EXPORT_REGISTRY[module];
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const btn =
    buttonClassName ??
    (size === "sm"
      ? "admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
      : "admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold");

  if (!config.importEnabled && !config.exportEnabled) return null;

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {config.importEnabled ? (
          <button
            type="button"
            disabled={!canWrite}
            title={canWrite ? "استيراد من ملف" : "صلاحية الكتابة مطلوبة"}
            className={cn(btn, "disabled:opacity-50")}
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4" aria-hidden />
            استيراد
          </button>
        ) : null}
        {config.exportEnabled ? (
          <button type="button" className={btn} onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4" aria-hidden />
            تصدير
          </button>
        ) : null}
        {showHistory ? (
          <button
            type="button"
            className={cn(btn, "opacity-90")}
            onClick={() => setHistoryOpen(true)}
            title="سجل الاستيراد والتصدير"
          >
            <History className="h-4 w-4" aria-hidden />
            السجل
          </button>
        ) : null}
      </div>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        module={module}
        onSuccess={() => {
          onImportSuccess?.();
        }}
      />
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        module={module}
        selectedIds={selectedIds}
      />
      <ImportExportHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        module={module}
      />
    </>
  );
}
