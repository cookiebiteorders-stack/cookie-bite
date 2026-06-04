"use client";

import Link from "next/link";
import { SectionHeading } from "@/components/sections/section-heading";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { useLanguage } from "@/components/providers/language-provider";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import type { LegalSection } from "@/lib/legal/types";
import { cn } from "@/lib/utils";

type Props = {
  pageKey: "privacy" | "terms";
  path: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export function LegalDocumentPage({ pageKey, path, lastUpdated, sections }: Props) {
  const { t } = useLanguage();
  const prefix = `legal.${pageKey}`;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("helpLayout.home"), path: "/" },
    { name: t(`${prefix}.breadcrumb`), path },
  ]);

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <JsonLdScript id={`${pageKey}-breadcrumb-jsonld`} json={breadcrumbJsonLd} />
      <div className="mx-auto max-w-3xl px-4 text-start lg:px-6">
        <SectionHeading
          align="left"
          className="text-start"
          eyebrow={t("legal.eyebrow")}
          title={t(`${prefix}.title`)}
          subtitle={t(`${prefix}.subtitle`)}
        />

        <p className="mt-4 text-xs font-medium text-cb-text-muted">
          {t("legal.lastUpdated", { date: lastUpdated })}
        </p>

        <nav
          aria-label={t("legal.tocLabel")}
          className="mt-8 rounded-2xl border border-cb-border bg-white/80 p-4 shadow-sm"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-stone-600">
            {t("legal.tocLabel")}
          </p>
          <ol className="mt-3 columns-1 gap-x-6 text-sm sm:columns-2">
            {sections.map((section) => (
              <li key={section.id} className="mb-1.5 break-inside-avoid">
                <a
                  href={`#${section.id}`}
                  className="text-cb-terracotta-dark underline-offset-2 hover:underline"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-cb-text">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-28 border-b border-cb-border/60 pb-8 last:border-0"
            >
              <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
                {section.heading}
              </h2>
              <div className={cn("mt-3 space-y-3", section.highlight && "rounded-2xl bg-cb-peach/50 p-4")}>
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 48)} className="text-cb-text">
                    {p}
                  </p>
                ))}
                {section.list?.length ? (
                  <ul className="ms-4 list-disc space-y-2 text-cb-text marker:text-amber-700">
                    {section.list.map((item) => (
                      <li key={item.slice(0, 48)}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <aside className="mt-12 rounded-2xl border border-cb-border bg-cb-surface-elevated p-6 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-cb-text-strong">
            {t("legal.contactBox.title")}
          </h3>
          <p className="mt-2 text-sm text-cb-text-muted">{t("legal.contactBox.body")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="rounded-xl bg-cb-terracotta-dark px-4 py-2 text-sm font-bold text-cb-cream-2 hover:opacity-90"
            >
              {t("legal.contactBox.contactCta")}
            </Link>
            <Link
              href="/help"
              className="rounded-xl border border-cb-border bg-white px-4 py-2 text-sm font-bold text-stone-800 hover:border-amber-300"
            >
              {t("legal.contactBox.helpCta")}
            </Link>
            <Link
              href={pageKey === "privacy" ? "/terms" : "/privacy"}
              className="rounded-xl border border-cb-border bg-white px-4 py-2 text-sm font-bold text-stone-800 hover:border-amber-300"
            >
              {pageKey === "privacy"
                ? t("legal.contactBox.termsLink")
                : t("legal.contactBox.privacyLink")}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
