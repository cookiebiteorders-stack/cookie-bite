"use client";

import Link from "next/link";
import { SectionHeading } from "@/components/sections/section-heading";
import { useLanguage } from "@/components/providers/language-provider";

export function ReturnsPageBody() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-3xl px-4 lg:px-6">
      <SectionHeading
        align="start"
        eyebrow={t("pages.returns.eyebrow")}
        title={t("pages.returns.title")}
        subtitle={t("pages.returns.subtitle")}
      />
      <div className="mt-10 max-w-none text-cb-text">
        <section className="rounded-3xl border border-cb-border bg-cb-surface p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
            {t("pages.returns.perishableTitle")}
          </h2>
          <p className="mt-2 leading-relaxed">{t("pages.returns.perishableBody")}</p>
        </section>
        <section className="mt-6 rounded-3xl border border-cb-border bg-cb-surface p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
            {t("pages.returns.wrongTitle")}
          </h2>
          <p className="mt-2 leading-relaxed">{t("pages.returns.wrongBody")}</p>
        </section>
        <section className="mt-6 rounded-3xl border border-cb-border bg-cb-surface p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
            {t("pages.returns.refundTitle")}
          </h2>
          <p className="mt-2 leading-relaxed">{t("pages.returns.refundBody")}</p>
        </section>
      </div>
      <p className="mt-10 text-center text-sm text-cb-text-muted">
        <Link href="/contact" className="font-bold text-cb-terracotta-dark hover:underline">
          {t("pages.returns.contactCare")}
        </Link>
      </p>
    </div>
  );
}
