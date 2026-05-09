"use client";

import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";

export function GiftIdeasClient() {
  const { t } = useLanguage();

  return (
    <div className="bg-cb-cream pb-20 pt-10">
      <div className="mx-auto max-w-7xl cb-gutter space-y-6 text-center">
        <h1 className="font-serif text-4xl font-semibold text-cb-text-strong">
          {t("pages.giftIdeas.title")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-cb-text">{t("pages.giftIdeas.subtitle")}</p>
        <div className="flex justify-center gap-4">
          <Link href="/gift-box" className={buttonClassName("primary", "px-8")}>
            {t("pages.giftIdeas.exploreBoxes")}
          </Link>
          <Link href="/contact" className={buttonClassName("outline", "px-8")}>
            {t("pages.giftIdeas.corporate")}
          </Link>
        </div>
      </div>
    </div>
  );
}
