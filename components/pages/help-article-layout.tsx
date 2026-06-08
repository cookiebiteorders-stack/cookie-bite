"use client";

import Link from "next/link";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { resolveHelpArticle } from "@/lib/content/help-articles-ar";
import { useFreeShippingThreshold } from "@/components/providers/store-commerce-settings-provider";
import type { HelpArticleContent } from "@/lib/content/help-articles";
import { interpolateFreeShippingThreshold } from "@/lib/store/commerce-settings-shared";

type Props = {
  article: HelpArticleContent;
};

function withThreshold(content: HelpArticleContent, threshold: number): HelpArticleContent {
  return {
    ...content,
    sections: content.sections.map((section) => ({
      ...section,
      paragraphs: section.paragraphs.map((p) =>
        interpolateFreeShippingThreshold(p, threshold),
      ),
    })),
  };
}

export function HelpArticleLayout({ article }: Props) {
  const { lang, t } = useLanguage();
  const threshold = useFreeShippingThreshold();
  const content = withThreshold(resolveHelpArticle(article, lang), threshold);

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-3xl px-4 text-start lg:px-6">
        <nav className="mb-6 text-sm text-cb-text-muted">
          <Link href="/" className="hover:text-cb-terracotta-dark">
            {t("helpLayout.home")}
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <Link href="/help" className="hover:text-cb-terracotta-dark">
            {t("helpLayout.helpCenter")}
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <span className="text-cb-text">{content.title}</span>
        </nav>

        <SectionHeading align="start" title={content.title} />

        {content.sections.map((section) => (
          <section key={section.heading} className="mt-10">
            <h2 className="font-serif text-xl font-semibold text-cb-text-strong">{section.heading}</h2>
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="mt-3 text-sm leading-relaxed text-cb-text">
                {p}
              </p>
            ))}
          </section>
        ))}

        {content.relatedLinks.length ? (
          <div className="mt-12 rounded-2xl border border-cb-border bg-cb-surface p-6">
            <h3 className="font-serif text-lg font-semibold text-cb-text-strong">
              {t("helpLayout.related")}
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {content.relatedLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-semibold text-cb-terracotta-dark hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Link href="/shop" className={buttonClassName("primary", "mt-10 inline-flex rounded-full px-8")}>
          {t("helpLayout.shopCta")}
        </Link>
      </div>
    </div>
  );
}
