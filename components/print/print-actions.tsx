"use client";

import { Download, Printer } from "lucide-react";
import { openPrintDocument, printFocusedElement } from "@/lib/print/print-document";
import { cn } from "@/lib/utils";

type PrintActionsProps = {
  /** Full HTML document (from renderShell) — opens dedicated print window */
  html?: string;
  title?: string;
  /** Print a DOM subtree (e.g. invoice) */
  printRootSelector?: string;
  /** Direct PDF download URL */
  pdfHref?: string;
  className?: string;
  size?: "sm" | "md";
  onPrintBlocked?: () => void;
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
  className,
  size = "md",
  onPrintBlocked,
}: PrintActionsProps) {
  const btn = cn(
    "inline-flex items-center justify-center rounded-xl border border-cb-border bg-white font-semibold text-cb-text-strong shadow-sm transition hover:bg-cb-peach/40 disabled:opacity-50 dark:bg-stone-900/80 dark:text-stone-100",
    sizeClasses[size],
  );

  const handlePrint = () => {
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
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="group" aria-label="Print and export">
      <button type="button" className={btn} onClick={handlePrint}>
        <Printer className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
        Print
      </button>
      {pdfHref ? (
        <a
          href={pdfHref}
          className={cn(
            btn,
            "border-cb-terracotta-dark bg-cb-terracotta-dark text-white hover:bg-cb-brand-logo",
          )}
          download
          target="_blank"
          rel="noopener noreferrer"
        >
          <Download className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
          Download PDF
        </a>
      ) : html ? (
        <button
          type="button"
          className={cn(
            btn,
            "border-cb-terracotta-dark bg-cb-terracotta-dark text-white hover:bg-cb-brand-logo",
          )}
          onClick={handlePrint}
          title="Use your browser's Save as PDF in the print dialog"
        >
          <Download className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
          Save as PDF
        </button>
      ) : null}
    </div>
  );
}
