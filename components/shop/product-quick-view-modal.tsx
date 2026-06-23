"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, X } from "lucide-react";
import type { Product } from "@/lib/data";
import { useLanguage } from "@/components/providers/language-provider";
import { ProductCartActions } from "@/components/product/product-cart-actions";
import { EMPTY_LINKED_ADDONS } from "@/lib/addons/constants";
import {
  ProductAddonPicker,
  useAddonSelectionState,
} from "@/components/product/product-addon-picker";
import { ProductPriceDisplay } from "@/components/product/product-price-display";
import { PdpMediaGallery } from "@/components/shop/pdp-media-gallery";
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
  const { t } = useLanguage();
  const linkedAddons = product?.linkedAddons ?? EMPTY_LINKED_ADDONS;
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
  const galleryImages = product?.images?.length ? product.images : product ? [product.image] : [];

  return (
    <AnimatePresence>
      {open && product ? (
        <motion.div
          key="product-quick-view"
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: easeSoft }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-cb-scrim-strong/65 backdrop-blur-[2px]"
            aria-label={t("pages.shop.closeQuickView")}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-view-title"
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.24, ease: easeSoft }}
            className={cn(
              "relative z-10 flex w-full max-w-2xl flex-col overflow-hidden border border-cb-border/80 bg-cb-surface shadow-2xl",
              "max-h-[min(92dvh,820px)] rounded-3xl",
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-cb-border px-4 py-3 sm:px-5">
              <h2
                id="quick-view-title"
                className="font-serif text-lg font-semibold text-cb-text-strong sm:text-xl"
              >
                {t("search.quickView")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cb-border bg-cb-cream/80 transition hover:bg-cb-peach/40"
                aria-label={t("pages.shop.closeQuickView")}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="border-b border-cb-border/60 bg-gradient-to-b from-cb-peach/25 to-cb-surface px-4 py-4 sm:px-5">
                <PdpMediaGallery
                  productId={product.id}
                  productName={product.name}
                  images={galleryImages}
                  videoUrl={product.videoUrl}
                  sizes="(max-width:640px) 88vw, 560px"
                />
              </div>

              <div className="space-y-3 px-4 py-4 sm:px-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-cb-text-muted">
                  {product.category}
                </p>
                <h3 className="font-serif text-xl font-semibold text-cb-text-strong sm:text-2xl">
                  {product.name}
                </h3>
                <div className="flex items-center gap-1.5">
                  {product.hasVariants ? (
                    <span className="text-xs font-semibold text-cb-text-muted">
                      {t("product.priceFromPrefix")}
                    </span>
                  ) : null}
                  <ProductPriceDisplay
                    price={product.priceFrom ?? product.price}
                    comparePrice={product.hasVariants ? null : product.comparePrice}
                    size="md"
                  />
                </div>
                <p className="text-sm leading-relaxed text-cb-text-muted sm:text-base">
                  {product.description}
                </p>
                {outOfStock ? (
                  <p className="text-sm font-semibold text-red-700">{t("product.outOfStock")}</p>
                ) : null}
              </div>

              {hasAddons ? (
                <div className="px-4 pb-4 sm:px-5">
                  <ProductAddonPicker
                    linkedAddons={addons}
                    selected={selected}
                    onSelectedChange={setSelected}
                  />
                </div>
              ) : null}
            </div>

            <div
              className="flex shrink-0 flex-col gap-2 border-t border-cb-border bg-cb-surface px-4 py-4 sm:px-5"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {!outOfStock && !hasAddons && !product.hasVariants ? (
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
                  {product.hasVariants
                    ? t("product.chooseSize")
                    : hasAddons
                      ? t("product.addonsCustomize")
                      : t("product.viewDetails")}
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
