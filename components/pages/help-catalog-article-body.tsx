"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ThumbsDown, ThumbsUp } from "lucide-react";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import type { HelpCenterArticle, HelpCenterBlock } from "@/lib/content/help-center";
import { getHelpArticlesByCategory, helpArticlePath } from "@/lib/content/help-center";
import { cn } from "@/lib/utils";

type Props = {
  article: HelpCenterArticle;
};

function HelpBlockView({ block, isRtl }: { block: HelpCenterBlock; isRtl: boolean }) {
  return (
    <div className="space-y-3">
      {block.heading ? (
        <h2
          className={cn(
            "font-serif text-xl font-semibold text-cb-text-strong",
            isRtl ? "border-e-4 border-cb-terracotta-dark pe-4" : "border-s-4 border-cb-terracotta-dark ps-4",
          )}
        >
          {block.heading}
        </h2>
      ) : null}
      {block.paragraphs?.map((p) => (
        <p key={p.slice(0, 48)} className="text-sm leading-relaxed text-cb-text sm:text-base">
          {p}
        </p>
      ))}
      {block.list?.length ? (
        <ul className="list-disc space-y-2 pe-6 text-sm leading-relaxed text-cb-text sm:text-base">
          {block.list.map((item) => (
            <li key={item.slice(0, 48)}>{item}</li>
          ))}
        </ul>
      ) : null}
      {block.steps?.length ? (
        <ol className="space-y-4">
          {block.steps.map((step, index) => (
            <li key={step.slice(0, 48)} className="flex gap-3 text-sm leading-relaxed text-cb-text sm:text-base">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cb-terracotta-dark text-sm font-bold text-white"
                aria-hidden
              >
                {index + 1}
              </span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {block.callout ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm leading-relaxed",
            block.callout.variant === "tip"
              ? "border-amber-200/80 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
              : "border-yellow-300/80 bg-yellow-50/90 text-yellow-950 dark:border-yellow-900/40 dark:bg-yellow-950/25 dark:text-yellow-100",
          )}
        >
          {block.callout.text}
        </div>
      ) : null}
    </div>
  );
}

export function HelpCatalogArticleBody({ article }: Props) {
  const { lang, t } = useLanguage();
  const isRtl = lang === "ar";
  const [helpful, setHelpful] = useState<"yes" | "no" | null>(null);

  const localized = useMemo(
    () => ({
      title: article.title[lang],
      description: article.description[lang],
      readTime: article.readTime[lang],
      blocks: article.blocks[lang],
      relatedLinks: article.relatedLinks.map((link) => ({
        href: link.href,
        label: link.label[lang],
      })),
      categoryTitle: t(`pages.help.categories.${article.categoryId}.title`),
    }),
    [article, lang, t],
  );

  const siblings = useMemo(
    () => getHelpArticlesByCategory(article.categoryId).filter((a) => a.id !== article.id),
    [article.categoryId, article.id],
  );

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-3xl px-4 text-start lg:px-6">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-cb-text-muted">
          <Link href="/" className="hover:text-cb-terracotta-dark">
            {t("helpLayout.home")}
          </Link>
          <span aria-hidden>/</span>
          <Link href="/help" className="hover:text-cb-terracotta-dark">
            {t("helpLayout.helpCenter")}
          </Link>
          <span aria-hidden>/</span>
          <Link href={`/help#cat-${article.categoryId}`} className="hover:text-cb-terracotta-dark">
            {localized.categoryTitle}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-cb-text">{localized.title}</span>
        </nav>

        <Link
          href={`/help#cat-${article.categoryId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-cb-terracotta-dark hover:underline"
        >
          {isRtl ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden />
          )}
          {t("helpLayout.backToCategory", { category: localized.categoryTitle })}
        </Link>

        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-cb-terracotta-dark">
          <span className="rounded-full bg-cb-peach/60 px-3 py-1">{localized.categoryTitle}</span>
          <span className="text-cb-text-muted">{localized.readTime}</span>
        </div>

        <SectionHeading align="left" className="mt-4 text-start" title={localized.title} subtitle={localized.description} />

        <div className="mt-10 space-y-10 rounded-3xl border border-cb-border bg-cb-surface p-6 shadow-sm sm:p-8">
          {localized.blocks.map((block, index) => (
            <HelpBlockView key={`${block.heading ?? "p"}-${index}`} block={block} isRtl={isRtl} />
          ))}

          <div className="border-t border-cb-border pt-8">
            <p className="text-sm font-semibold text-cb-text-strong">{t("helpLayout.helpfulQuestion")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {helpful === "yes" ? (
                <p className="text-sm font-semibold text-emerald-700">{t("helpLayout.helpfulThanks")}</p>
              ) : helpful === "no" ? (
                <p className="text-sm font-semibold text-cb-terracotta-dark">
                  {t("helpLayout.helpfulContact")}
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setHelpful("yes")}
                    className={buttonClassName("outline", "inline-flex gap-2 rounded-full px-4 py-2 text-xs")}
                  >
                    <ThumbsUp className="h-4 w-4" aria-hidden />
                    {t("helpLayout.helpfulYes")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHelpful("no")}
                    className={buttonClassName("outline", "inline-flex gap-2 rounded-full px-4 py-2 text-xs")}
                  >
                    <ThumbsDown className="h-4 w-4" aria-hidden />
                    {t("helpLayout.helpfulNo")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {localized.relatedLinks.length > 0 ? (
          <div className="mt-10 rounded-2xl border border-cb-border bg-cb-surface p-6">
            <h3 className="font-serif text-lg font-semibold text-cb-text-strong">{t("helpLayout.related")}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {localized.relatedLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-semibold text-cb-terracotta-dark hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {siblings.length > 0 ? (
          <div className="mt-10">
            <h3 className="font-serif text-lg font-semibold text-cb-text-strong">{t("helpLayout.moreInCategory")}</h3>
            <ul className="mt-3 divide-y divide-cb-border rounded-2xl border border-cb-border bg-cb-surface">
              {siblings.map((sibling) => (
                <li key={sibling.id}>
                  <Link
                    href={helpArticlePath(sibling.id)}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-cb-text-strong transition hover:text-cb-terracotta-dark"
                  >
                    <span>
                      <span className="me-2" aria-hidden>
                        {sibling.icon}
                      </span>
                      {sibling.title[lang]}
                    </span>
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
