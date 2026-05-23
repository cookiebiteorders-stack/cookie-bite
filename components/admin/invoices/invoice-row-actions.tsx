"use client";

import { useState } from "react";
import { Download, Loader2, Pencil, Trash2 } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { downloadPdfFromUrl } from "@/lib/print/download-pdf";
import { cn } from "@/lib/utils";

type InvoiceRowActionsProps = {
  invoiceId: string;
  invoiceNumber: string;
  isEditable?: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  onError?: (message: string) => void;
  className?: string;
  compact?: boolean;
};

export function InvoiceRowActions({
  invoiceId,
  invoiceNumber,
  isEditable = true,
  onPreview,
  onEdit,
  onDeleted,
  onError,
  className,
  compact = false,
}: InvoiceRowActionsProps) {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pdfFilename = `${invoiceNumber.replace(/[^\w.-]+/g, "_")}.pdf`;

  const handlePdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      await downloadPdfFromUrl(
        `/api/invoices/${encodeURIComponent(invoiceNumber)}/pdf`,
        pdfFilename,
      );
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "فشل تحميل PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditable) {
      onError?.("لا يمكن حذف فواتير مُشتقة من الطلبات فقط.");
      return;
    }
    const ok = window.confirm(
      `حذف الفاتورة ${invoiceNumber}؟\nلا يمكن التراجع عن هذا الإجراء.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, { method: "DELETE" });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: { en?: string; ar?: string };
      };
      if (!res.ok) {
        throw new Error(payload.error?.ar ?? payload.error?.en ?? "فشل الحذف");
      }
      onDeleted();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "فشل الحذف");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditable) {
      onError?.("هذه الفاتورة مرتبطة بطلب فقط — أنشئ فاتورة يدوية منفصلة للتعديل.");
      return;
    }
    onEdit();
  };

  const btnSize = compact ? "min-h-0 rounded-lg px-2 py-1.5 text-[11px]" : "min-h-0 rounded-lg px-2.5 py-1.5 text-xs";

  return (
    <div
      className={cn("inline-flex flex-wrap items-center justify-end gap-1", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <button type="button" className={buttonClassName("ghost", btnSize)} onClick={onPreview}>
        Preview
      </button>
      <button
        type="button"
        className={buttonClassName("outline", btnSize)}
        onClick={handlePdf}
        disabled={downloading}
        title="تصدير PDF"
      >
        {downloading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        PDF
      </button>
      <button
        type="button"
        className={buttonClassName("outline", btnSize)}
        onClick={handleEdit}
        title="تعديل"
      >
        <Pencil className="h-3.5 w-3.5" />
        {!compact ? "Edit" : null}
      </button>
      <button
        type="button"
        className={cn(
          buttonClassName("outline", btnSize),
          "border-red-200 text-red-800 hover:bg-red-50 dark:border-red-900 dark:text-red-200",
        )}
        onClick={handleDelete}
        disabled={deleting || !isEditable}
        title={isEditable ? "حذف" : "غير قابل للحذف"}
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
