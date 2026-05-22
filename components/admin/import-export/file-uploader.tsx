"use client";

import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  accept?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  className?: string;
};

export function FileUploader({
  accept = ".csv,.xlsx,.pdf",
  disabled,
  onFile,
  className,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [name, setName] = useState<string | null>(null);

  const pick = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;
      setName(file.name);
      onFile(file);
    },
    [disabled, onFile],
  );

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 border-dashed p-6 text-center transition-colors",
        dragOver ? "border-cb-brand-400 bg-cb-brand-50/80" : "border-cb-border bg-cb-surface",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        pick(e.dataTransfer.files?.[0]);
      }}
    >
      <Upload className="mx-auto h-8 w-8 text-cb-brand-600" aria-hidden />
      <p className="mt-2 text-sm font-semibold text-cb-text-strong">اسحب الملف هنا أو اختر ملفاً</p>
      <p className="mt-1 text-xs text-cb-text-muted">CSV · XLSX · PDF (حتى 12MB)</p>
      {name ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-cb-brand-800">
          <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
          {name}
        </p>
      ) : null}
      <label className="mt-3 inline-block cursor-pointer rounded-lg bg-cb-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-cb-brand-700">
        اختيار ملف
        <input
          type="file"
          accept={accept}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
