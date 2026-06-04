"use client";

import Link from "next/link";
import type { Product } from "@/lib/data";
import { useLanguage } from "@/components/providers/language-provider";

type Props = {
  product: Product;
};

export function PdpProductSpecs({ product }: Props) {
  const { t } = useLanguage();

  const rows: Array<{ label: string; value: string }> = [];

  if (product.sku?.trim()) {
    rows.push({ label: t("product.pdpSku"), value: product.sku.trim() });
  }
  if (product.weightGrams != null && product.weightGrams > 0) {
    rows.push({
      label: t("product.pdpWeight"),
      value: t("product.pdpWeightValue", { grams: product.weightGrams }),
    });
  }
  if (product.piecesCount != null && product.piecesCount > 0) {
    rows.push({
      label: t("product.pdpPieces"),
      value: String(product.piecesCount),
    });
  }
  if (product.dietary?.length) {
    rows.push({
      label: t("product.pdpDietary"),
      value: product.dietary.join(" · "),
    });
  }
  if (product.seasons?.length) {
    rows.push({
      label: t("product.pdpSeasons"),
      value: product.seasons.join(" · "),
    });
  }

  const hasAdminSpecs = rows.length > 0;

  return (
    <div className="mt-10 space-y-4 rounded-3xl border border-cb-border bg-cb-surface p-6">
      <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
        {t("product.pdpDetails")}
      </h2>

      {hasAdminSpecs ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="rounded-2xl bg-cb-surface-2/80 px-4 py-3">
              <dt className="text-xs font-bold uppercase tracking-wide text-cb-text-muted">
                {row.label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-cb-text-strong">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <ul className="space-y-2 text-sm text-cb-text">
        {!hasAdminSpecs ? (
          <li>
            <strong className="text-cb-text-strong">{t("product.pdpIngredients")}</strong>{" "}
            {t("product.pdpIngredientsBody")}
          </li>
        ) : null}
        <li>
          <strong className="text-cb-text-strong">{t("product.pdpStorage")}</strong>{" "}
          {t("product.pdpStorageBody")}
        </li>
        <li>
          <strong className="text-cb-text-strong">{t("product.pdpDelivery")}</strong>{" "}
          {t("product.pdpDeliveryBody")}{" "}
          <Link href="/delivery/new-cairo" className="font-bold text-cb-terracotta-dark underline">
            {t("product.pdpDeliveryLink")}
          </Link>
          .
        </li>
      </ul>
    </div>
  );
}
