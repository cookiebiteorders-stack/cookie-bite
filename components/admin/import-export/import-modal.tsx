"use client";

import { useCallback, useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import type { ModuleKey } from "@/lib/admin/rbac";
import type { ColumnMapping, ImportPreviewResult } from "@/lib/admin/import-export/types";
import { MODULE_IMPORT_EXPORT_REGISTRY } from "@/lib/admin/import-export/module-registry";
import { useImportExport } from "@/hooks/use-import-export";
import { FileUploader } from "@/components/admin/import-export/file-uploader";
import { TablePreview } from "@/components/admin/import-export/table-preview";
import { ImportExportErrorModal } from "@/components/admin/import-export/error-modal";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  module: ModuleKey;
  onSuccess?: () => void;
};

export function ImportModal({ open, onClose, module, onSuccess }: Props) {
  const config = MODULE_IMPORT_EXPORT_REGISTRY[module];
  const { loading, previewImport, commitImport, downloadTemplate } = useImportExport(module);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<
    (ImportPreviewResult & { suggestedMapping: ColumnMapping }) | null
  >(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [errors, setErrors] = useState<string[]>([]);
  const [errorOpen, setErrorOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setMapping({});
    setStep("upload");
    setProgress(0);
    setErrors([]);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const runPreview = useCallback(
    async (f: File) => {
      setFile(f);
      setProgress(20);
      const result = await previewImport(f, mapping);
      setPreview(result);
      setMapping(result.suggestedMapping);
      setStep("preview");
      setProgress(60);
    },
    [mapping, previewImport],
  );

  const runCommit = useCallback(async () => {
    if (!file || !preview) return;
    setProgress(75);
    try {
      const result = await commitImport(file, mapping);
      setProgress(100);
      setStep("done");
      if (result.failures?.length) {
        setErrors(result.failures.map((f: { row: number; message: string }) => `صف ${f.row}: ${f.message}`));
        setErrorOpen(true);
      }
      onSuccess?.();
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "فشل الاستيراد"]);
      setErrorOpen(true);
    }
  }, [commitImport, file, mapping, onSuccess, preview]);

  if (!open || !config.importEnabled) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
        <button type="button" className="absolute inset-0 bg-black/45" aria-label="إغلاق" onClick={handleClose} />
        <div
          role="dialog"
          aria-labelledby="import-modal-title"
          className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-cb-border bg-cb-surface-elevated shadow-2xl sm:rounded-2xl"
        >
          <header className="flex items-center justify-between border-b border-cb-border px-4 py-3">
            <div>
              <h2 id="import-modal-title" className="text-sm font-bold text-cb-text-strong">
                استيراد — {config.label}
              </h2>
              <p className="text-[10px] text-cb-text-muted">CSV · XLSX · PDF مع معاينة وتعيين أعمدة</p>
            </div>
            <button type="button" onClick={handleClose} className="rounded-lg p-1.5 hover:bg-cb-surface">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <div className="h-1 bg-cb-border">
            <div
              className="h-full bg-cb-brand-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {step === "upload" ? (
              <>
                <FileUploader disabled={loading} onFile={(f) => void runPreview(f)} />
                <button
                  type="button"
                  className="text-xs font-semibold text-cb-brand-700 underline"
                  onClick={downloadTemplate}
                >
                  تنزيل قالب CSV
                </button>
              </>
            ) : null}

            {step === "preview" && preview ? (
              <>
                <TablePreview
                  headers={preview.headers}
                  rows={preview.rows}
                  issues={preview.issues}
                />
                {config.templateColumns.length > 0 ? (
                  <div className="space-y-2 rounded-xl border border-cb-border p-3">
                    <p className="text-xs font-bold text-cb-text-strong">تعيين الأعمدة</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {config.templateColumns.map((col) => (
                        <label key={col.key} className="flex flex-col gap-0.5 text-[10px]">
                          <span className="font-semibold text-cb-text-muted">
                            {col.label}
                            {col.required ? " *" : ""}
                          </span>
                          <select
                            className="rounded-lg border border-cb-border bg-cb-surface px-2 py-1.5 text-xs"
                            value={mapping[col.key] ?? ""}
                            onChange={(e) =>
                              setMapping((m: ColumnMapping) => ({ ...m, [col.key]: e.target.value }))
                            }
                          >
                            <option value="">—</option>
                            {preview.headers.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      className="text-xs font-bold text-cb-brand-700"
                      onClick={() => file && void runPreview(file)}
                    >
                      إعادة المعاينة
                    </button>
                  </div>
                ) : null}
                <p className="text-xs text-cb-text-muted">
                  صفوف صالحة: {preview.mappedRows.length}
                  {preview.duplicates.length > 0
                    ? ` · تكرارات: ${preview.duplicates.length}`
                    : ""}
                  {preview.issues.length > 0 ? ` · تحذيرات: ${preview.issues.length}` : ""}
                </p>
              </>
            ) : null}

            {step === "done" ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden />
                <p className="text-sm font-bold text-cb-text-strong">اكتمل الاستيراد</p>
              </div>
            ) : null}
          </div>

          <footer className="flex flex-wrap justify-end gap-2 border-t border-cb-border px-4 py-3">
            <button type="button" onClick={handleClose} className="admin-btn-secondary rounded-lg px-3 py-2 text-xs font-bold">
              إلغاء
            </button>
            {step === "preview" ? (
              <button
                type="button"
                disabled={loading || !preview?.mappedRows.length}
                onClick={() => void runCommit()}
                className={cn(
                  "admin-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-50",
                )}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                حفظ {preview?.mappedRows.length ?? 0} صف
              </button>
            ) : null}
            {step === "done" ? (
              <button type="button" onClick={handleClose} className="admin-btn-primary rounded-lg px-4 py-2 text-xs font-bold">
                إغلاق
              </button>
            ) : null}
          </footer>
        </div>
      </div>
      <ImportExportErrorModal open={errorOpen} errors={errors} onClose={() => setErrorOpen(false)} />
    </>
  );
}
