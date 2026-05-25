"use client";

import Link from "next/link";
import { SectionHeading } from "@/components/sections/section-heading";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";

const FAQ_KEYS = ["0", "1", "2", "3"] as const;

export function CorporateGiftingClient() {
  const { t } = useLanguage();

  const sections = [
    {
      heading: t("pages.corporateGifting.sections.perfectFor.heading"),
      body: t("pages.corporateGifting.sections.perfectFor.body"),
    },
    {
      heading: t("pages.corporateGifting.sections.branding.heading"),
      body: t("pages.corporateGifting.sections.branding.body"),
    },
    {
      heading: t("pages.corporateGifting.sections.howToStart.heading"),
      body: t("pages.corporateGifting.sections.howToStart.body"),
    },
  ];

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <SectionHeading
          align="left"
          className="text-left"
          eyebrow={t("pages.corporateGifting.eyebrow")}
          title={t("pages.corporateGifting.title")}
          subtitle={t("pages.corporateGifting.subtitle")}
        />

        {sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="font-serif text-xl font-semibold text-cb-text-strong">{s.heading}</h2>
            <p className="mt-3 text-sm leading-relaxed text-cb-text">{s.body}</p>
          </section>
        ))}

        <section className="mt-12">
          <h2 className="font-serif text-xl font-semibold text-cb-text-strong">
            {t("pages.corporateGifting.faqTitle")}
          </h2>
          <ul className="mt-6 space-y-4">
            {FAQ_KEYS.map((key) => (
              <li
                key={key}
                className="rounded-2xl border border-cb-border bg-cb-surface p-5"
              >
                <h3 className="font-semibold text-cb-text-strong">
                  {t(`pages.corporateGifting.faq.items.${key}.q`)}
                </h3>
                <p className="mt-2 text-sm text-cb-text">
                  {t(`pages.corporateGifting.faq.items.${key}.a`)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <Link
          href="/contact"
          className={buttonClassName("primary", "mt-10 inline-flex rounded-full px-8")}
        >
          {t("pages.corporateGifting.cta")}
        </Link>
      </div>
    </div>
  );
}
