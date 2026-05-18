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
 * Opens a dedicated window with the document HTML and triggers the system print
 * dialog (Save as PDF keeps embedded styles & colors).
 */
export function openPrintDocument(opts: { html: string; title?: string }): boolean {
  if (typeof window === "undefined") return false;

  const popup = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=920,height=1180",
  );
  if (!popup) {
    return false;
  }

  const docHtml = injectPrintGuard(opts.html);
  popup.document.open();
  popup.document.write(docHtml);
  popup.document.close();

  if (opts.title) {
    try {
      popup.document.title = opts.title;
    } catch {
      /* cross-origin guard */
    }
  }

  const trigger = () => {
    popup.focus();
    setTimeout(() => {
      popup.print();
    }, 400);
  };

  if (popup.document.readyState === "complete") {
    trigger();
  } else {
    popup.addEventListener("load", trigger, { once: true });
  }

  popup.addEventListener(
    "afterprint",
    () => {
      setTimeout(() => popup.close(), 300);
    },
    { once: true },
  );

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
