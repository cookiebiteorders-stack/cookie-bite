"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { useLanguage } from "@/components/providers/language-provider";
import { buildBreadcrumbJsonLd } from "@/lib/seo";

type Section = {
  heading?: string;
  paragraphs: string[];
  highlight?: boolean;
};

type Props = {
  pageKey: "privacy" | "terms";
  path: string;
  sections: Section[];
};

export function LegalDocumentPage({ pageKey, path, sections }: Props) {
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
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-cb-text">
          {sections.map((section, i) => (
            <div key={i}>
              {section.heading ? (
                <h2 className="mb-2 font-serif text-lg font-semibold text-cb-text-strong">
                  {section.heading}
                </h2>
              ) : null}
              {section.paragraphs.map((p) =>
                section.highlight ? (
                  <p
                    key={p.slice(0, 32)}
                    className="rounded-2xl bg-cb-peach/60 p-4 text-cb-text-strong"
                  >
                    {p}
                  </p>
                ) : (
                  <p key={p.slice(0, 32)} className={section.heading ? "mt-2" : ""}>
                    {p}
                  </p>
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
