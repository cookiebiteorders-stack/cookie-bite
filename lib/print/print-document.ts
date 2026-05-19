"use client";

const PRINT_COLOR_GUARD = `
@page { size: A4; margin: 10mm 12mm 14mm; }
*, *::before, *::after {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
}
`;

function injectPrintGuard(html: string): string {
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `<style>${PRINT_COLOR_GUARD}</style></head>`);
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${PRINT_COLOR_GUARD}</style></head><body>${html}</body></html>`;
}

/**
 * Opens HTML in a new tab via Blob URL and triggers the print dialog.
 * (Do not use noopener — it blocks document.write; Blob URL avoids that.)
 */
export function openPrintDocument(opts: { html: string; title?: string }): boolean {
  if (typeof window === "undefined") return false;

  const docHtml = injectPrintGuard(opts.html);
  const blob = new Blob([docHtml], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  const popup = window.open(blobUrl, "_blank");
  if (!popup) {
    URL.revokeObjectURL(blobUrl);
    return false;
  }

  let printed = false;

  const runPrint = () => {
    if (printed) return;
    printed = true;
    try {
      if (opts.title) {
        popup.document.title = opts.title;
      }
    } catch {
      /* ignore */
    }
    try {
      popup.focus();
      popup.print();
    } catch {
      /* popup closed */
    }
  };

  const revokeLater = () => {
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  };

  try {
    popup.addEventListener("load", () => {
      revokeLater();
      window.setTimeout(runPrint, 350);
    }, { once: true });
  } catch {
    /* ignore */
  }

  window.setTimeout(() => {
    revokeLater();
    runPrint();
  }, 900);

  return true;
}

/**
 * Prints only the element marked as print root (hides admin/site chrome via print.css).
 */
export function printFocusedElement(root: HTMLElement): void {
  if (typeof window === "undefined") return;

  root.setAttribute("data-cb-print-root", "true");

  const cleanup = () => {
    root.removeAttribute("data-cb-print-root");
    document.body.classList.remove("cb-print-active");
    window.removeEventListener("afterprint", cleanup);
  };

  document.body.classList.add("cb-print-active");
  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
}

export function printInvoiceElement(): void {
  const root = document.querySelector(".inv-root");
  if (root instanceof HTMLElement) {
    printFocusedElement(root);
    return;
  }
  window.print();
}
