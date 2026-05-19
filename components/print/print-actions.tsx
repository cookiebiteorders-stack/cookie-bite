"use client";

import { useCallback, useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { downloadPdfFromUrl } from "@/lib/print/download-pdf";
import { openPrintDocument, printFocusedElement } from "@/lib/print/print-document";
import { cn } from "@/lib/utils";

type PrintActionsProps = {
  html?: string;
  title?: string;
  printRootSelector?: string;
  pdfHref?: string;
  pdfFilename?: string;
  className?: string;
  size?: "sm" | "md";
  onPrintBlocked?: () => void;
  onDownloadError?: (message: string) => void;
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

export function PrintActions({
  html,
  title,
  printRootSelector,
  pdfHref,
  pdfFilename = "document.pdf",
  className,
  size = "md",
  onPrintBlocked,
  onDownloadError,
}: PrintActionsProps) {
  const [downloading, setDownloading] = useState(false);

  const btn = cn(
    "inline-flex items-center justify-center rounded-xl border border-cb-border bg-white font-semibold text-cb-text-strong shadow-sm transition hover:bg-cb-peach/40 disabled:opacity-50 dark:bg-stone-900/80 dark:text-stone-100",
    sizeClasses[size],
  );

  const handlePrint = useCallback(() => {
    if (html) {
      const ok = openPrintDocument({ html, title });
      if (!ok) onPrintBlocked?.();
      return;
    }
    if (printRootSelector) {
      const el = document.querySelector(printRootSelector);
      if (el instanceof HTMLElement) {
        printFocusedElement(el);
        return;
      }
    }
    window.print();
  }, [html, title, printRootSelector, onPrintBlocked]);

  const handleDownloadPdf = useCallback(async () => {
    if (!pdfHref) {
      handlePrint();
      return;
    }
    setDownloading(true);
    try {
      await downloadPdfFromUrl(pdfHref, pdfFilename);
    } catch (e) {
      const message = e instanceof Error ? e.message : "PDF download failed";
      onDownloadError?.(message);
    } finally {
      setDownloading(false);
    }
  }, [pdfHref, pdfFilename, handlePrint, onDownloadError]);

  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="group"
      aria-label="Print and export"
    >
      <button type="button" className={btn} onClick={handlePrint}>
        <Printer className={iconClass} aria-hidden />
        Print
      </button>
      {pdfHref ? (
        <button
          type="button"
          className={cn(
            btn,
            "border-cb-terracotta-dark bg-cb-terracotta-dark text-white hover:bg-cb-brand-logo",
          )}
          disabled={downloading}
          onClick={() => void handleDownloadPdf()}
        >
          {downloading ? (
            <Loader2 className={cn(iconClass, "animate-spin")} aria-hidden />
          ) : (
            <Download className={iconClass} aria-hidden />
          )}
          {downloading ? "Downloading…" : "Download PDF"}
        </button>
      ) : html ? (
        <button
          type="button"
          className={cn(
            btn,
            "border-cb-terracotta-dark bg-cb-terracotta-dark text-white hover:bg-cb-brand-logo",
          )}
          onClick={handlePrint}
          title="Opens print dialog — choose Save as PDF"
        >
          <Download className={iconClass} aria-hidden />
          Save as PDF
        </button>
      ) : null}
    </div>
  );
}
