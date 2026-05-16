"use client";

import { useMemo, useState } from "react";
import { ExternalLink, LayoutTemplate } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const TEMPLATE_PATHS = [
  { id: "delivery", file: "delivery_zones_manager.html", labelKey: "pages.designLibrary.tabDelivery" as const },
  { id: "emailCore", file: "ecommerce_email_templates.html", labelKey: "pages.designLibrary.tabEmailCore" as const },
  { id: "emailMore", file: "missing_email_templates.html", labelKey: "pages.designLibrary.tabEmailMore" as const },
  { id: "reports", file: "ecommerce_report_templates.html", labelKey: "pages.designLibrary.tabReports" as const },
  { id: "reportsMore", file: "missing_report_templates.html", labelKey: "pages.designLibrary.tabReportsMore" as const },
  { id: "invoice", file: "invoice-template.html", labelKey: "pages.designLibrary.tabInvoice" as const },
];

export function DesignLibraryView() {
  const { t } = useLanguage();
  const [active, setActive] = useState(TEMPLATE_PATHS[0]!.id);

  const src = useMemo(() => {
    const item = TEMPLATE_PATHS.find((x) => x.id === active);
    if (!item) return "";
    return `/design-library/${item.file}`;
  }, [active]);

  return (
    <section className="space-y-5 pb-10">
      <header className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cb-peach/40 text-cb-terracotta-dark dark:bg-stone-800 dark:text-amber-200">
              <LayoutTemplate className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-cb-text-strong sm:text-3xl">
                {t("pages.designLibrary.title")}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-cb-text-muted sm:text-base">
                {t("pages.designLibrary.intro")}
              </p>
            </div>
          </div>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-cb-border bg-cb-surface px-4 py-2.5 text-sm font-semibold text-cb-text-strong transition hover:bg-cb-surface-2"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {t("pages.designLibrary.openNewTab")}
          </a>
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <nav
          className="flex shrink-0 flex-wrap gap-2 lg:w-56 lg:flex-col lg:flex-nowrap"
          aria-label={t("pages.designLibrary.title")}
        >
          {TEMPLATE_PATHS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-sm font-semibold transition lg:w-full",
                active === tab.id
                  ? "border-cb-terracotta-dark bg-cb-peach/30 text-cb-text-strong dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
                  : "border-cb-border bg-cb-surface-elevated text-cb-text-muted hover:border-cb-border hover:bg-cb-surface-2",
              )}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </nav>

        <div className="min-h-[min(78vh,860px)] min-w-0 flex-1 overflow-hidden rounded-3xl border border-cb-border bg-cb-surface shadow-sm">
          <iframe
            key={src}
            title={t("pages.designLibrary.title")}
            src={src}
            className="h-[min(78vh,860px)] w-full border-0 bg-white"
          />
        </div>
      </div>
    </section>
  );
}
