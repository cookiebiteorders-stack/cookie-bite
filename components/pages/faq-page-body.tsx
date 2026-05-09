"use client";

import { useLayoutEffect, useMemo } from "react";
import Link from "next/link";
import { SectionHeading } from "@/components/sections/section-heading";
import { BRAND } from "@/lib/brand";
import { useLanguage } from "@/components/providers/language-provider";

const FAQ_KEYS = ["0", "1", "2", "3", "4"] as const;

const FAQ_JSONLD_SCRIPT_ID = "cookie-bite-faq-jsonld";

export function FaqPageBody() {
  const { t } = useLanguage();

  const faqs = useMemo(
    () =>
      FAQ_KEYS.map((id) => ({
        q: t(`pages.faq.items.${id}.q`),
        a: t(`pages.faq.items.${id}.a`, {
          location: BRAND.location,
          threshold: BRAND.freeDeliveryThresholdEgp,
          phone: BRAND.phoneDisplay,
        }),
      })),
    [t],
  );

  const faqJsonLd = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      }),
    [faqs],
  );

  useLayoutEffect(() => {
    let el = document.getElementById(FAQ_JSONLD_SCRIPT_ID) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = FAQ_JSONLD_SCRIPT_ID;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = faqJsonLd;
    return () => {
      document.getElementById(FAQ_JSONLD_SCRIPT_ID)?.remove();
    };
  }, [faqJsonLd]);

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <SectionHeading
          align="left"
          className="text-left"
          eyebrow={t("pages.faq.eyebrow")}
          title={t("pages.faq.title")}
          subtitle={t("pages.faq.subtitle")}
        />
        <ul className="mt-10 space-y-6">
          {faqs.map((item) => (
            <li
              key={item.q}
              className="rounded-3xl border border-cb-border bg-cb-surface p-6 shadow-sm"
            >
              <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
                {item.q}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-cb-text">{item.a}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center text-sm text-cb-text-muted">
          {t("pages.faq.contactMore")}{" "}
          <Link href="/contact" className="font-bold text-cb-terracotta-dark hover:underline">
            {t("pages.faq.contactLink")}
          </Link>
        </p>
      </div>
    </>
  );
}
