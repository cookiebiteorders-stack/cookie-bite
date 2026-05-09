"use client";

import { useLanguage } from "@/components/providers/language-provider";

export function ShopLoadingFallback() {
  const { t } = useLanguage();
  return (
    <div className="cb-gutter py-10 text-sm text-cb-text-muted">{t("common.loadingShop")}</div>
  );
}

export function SearchLoadingFallback() {
  const { t } = useLanguage();
  return (
    <div className="cb-gutter py-16 text-cb-text-muted">{t("common.loadingSearch")}</div>
  );
}
