"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, X } from "lucide-react";
import type { Product } from "@/lib/data";
import { useLanguage } from "@/components/providers/language-provider";
import { ProductCartActions } from "@/components/product/product-cart-actions";
import {
  ProductAddonPicker,
  useAddonSelectionState,
} from "@/components/product/product-addon-picker";
import { ProductPriceDisplay } from "@/components/product/product-price-display";
import { buttonClassName } from "@/components/ui/button";
import { easeSoft } from "@/lib/motion/presets";
import { trackGa4Event } from "@/lib/analytics/ga4";
import { isProductOutOfStock } from "@/lib/products/stock";
import { cn } from "@/lib/utils";

type Props = {
  product: Product | null;
  open: boolean;
  onClose: () => void;
};

export function ProductQuickViewModal({ product, open, onClose }: Props) {
  const { t, lang } = useLanguage();
  const isRtl = lang === "ar";
  const linkedAddons = product?.linkedAddons ?? [];
  const { addons, selected, setSelected, selectedAddons, addonsTotal } =
    useAddonSelectionState(linkedAddons, { emptyOptional: true });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !product) return;
    trackGa4Event("quick_view", { product_id: product.id });
  }, [open, product]);

  const hasAddons = addons.length > 0;
  const outOfStock = product ? isProductOutOfStock(product.stock) : false;

  return (
    <AnimatePresence>
      {open && product ? (
        <motion.div
          key="product-quick-view"
          className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: easeSoft }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-cb-scrim-strong/60"
            aria-label={t("pages.shop.closeQuickView")}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-view-title"
            initial={{ y: 40, opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.26, ease: easeSoft }}
            className={cn(
              "relative z-10 flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden border bg-cb-surface shadow-2xl",
              "rounded-t-3xl sm:rounded-3xl",
              isRtl ? "sm:rounded-3xl" : "sm:rounded-3xl",
            )}
          >
            <div className="flex items-center justify-between border-b border-cb-border px-4 py-3 sm:px-5">
              <h2
                id="quick-view-title"
                className="font-serif text-lg font-semibold text-cb-text-strong"
              >
                {t("search.quickView")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cb-border"
                aria-label={t("pages.shop.closeQuickView")}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,9rem)_1fr]">
                <div className="relative mx-auto aspect-square w-full max-w-[9rem] overflow-hidden rounded-2xl bg-cb-peach/40 sm:mx-0">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="144px"
                    priority
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cb-text-muted">
                    {product.category}
                  </p>
                  <h3 className="font-serif text-xl font-semibold text-cb-text-strong">
                    {product.name}
                  </h3>
                  <ProductPriceDisplay
                    price={product.price}
                    comparePrice={product.comparePrice}
                    size="md"
                  />
                  <p className="line-clamp-4 text-sm leading-relaxed text-cb-text-muted">
                    {product.description}
                  </p>
                  {outOfStock ? (
                    <p className="text-sm font-semibold text-red-700">{t("product.outOfStock")}</p>
                  ) : null}
                </div>
              </div>

              {hasAddons ? (
                <div className="mt-4">
                  <ProductAddonPicker
                    linkedAddons={addons}
                    selected={selected}
                    onSelectedChange={setSelected}
                  />
                </div>
              ) : null}
            </div>

            <div
              className="flex flex-col gap-2 border-t border-cb-border px-4 py-4 sm:px-5"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {!outOfStock && !hasAddons ? (
                <ProductCartActions
                  product={product}
                  addons={addons}
                  selected={selected}
                  selectedAddons={selectedAddons}
                  addonsTotal={addonsTotal}
                  variant="pdp"
                />
              ) : (
                <Link
                  href={`/shop/${product.id}`}
                  onClick={onClose}
                  className={buttonClassName(
                    "primary",
                    "inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-full font-bold",
                  )}
                >
                  {hasAddons ? t("product.addonsCustomize") : t("product.viewDetails")}
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </Link>
              )}
              <Link
                href={`/shop/${product.id}`}
                onClick={onClose}
                className="text-center text-sm font-semibold text-cb-brand-600 underline-offset-2 hover:underline"
              >
                {t("product.viewDetails")}
              </Link>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
