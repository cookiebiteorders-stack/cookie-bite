"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ShoppingBag, X, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { FreeDeliveryBar } from "@/components/cart/free-delivery-bar";
import { buttonClassName } from "@/components/ui/button";
import { easeSoft } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";

const drawerEase = [0.22, 1, 0.36, 1] as const;

export function CartDrawer() {
  const {
    lines,
    isDrawerOpen,
    closeDrawer,
    setQuantity,
    removeItem,
    subtotalEgp,
    itemCount,
  } = useCart();
  const { t, lang } = useLanguage();
  const isRtl = lang === "ar";
  const slideX = isRtl ? "-100%" : "100%";

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isDrawerOpen, closeDrawer]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isDrawerOpen]);

  return (
    <AnimatePresence>
      {isDrawerOpen ? (
        <motion.div
          key="cart-drawer-root"
          className="fixed inset-0 z-[60]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: easeSoft }}
        >
          <button
            type="button"
            className="cb-cart-drawer__scrim cb-touch-manipulation absolute inset-0"
            aria-label={t("pages.cart.closeDrawer")}
            onClick={closeDrawer}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
            data-cart-drawer
            initial={{ x: slideX }}
            animate={{ x: 0 }}
            exit={{ x: slideX }}
            transition={{ duration: 0.3, ease: drawerEase }}
            className={cn(
              "cb-cart-drawer cb-cart-drawer__panel absolute inset-y-0 end-0 flex h-full max-h-[100dvh] w-full max-w-md flex-col overflow-hidden border-s",
              isRtl ? "rounded-tr-3xl rounded-br-3xl" : "rounded-tl-3xl rounded-bl-3xl",
            )}
          >
            <div
              className="cb-cart-drawer__header sticky top-0 z-10 flex shrink-0 items-center justify-between border-b px-[max(1.25rem,env(safe-area-inset-left))] py-3 pe-[max(1.25rem,env(safe-area-inset-right))] backdrop-blur-md"
              style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
              <div className="min-w-0">
                <h2
                  id="cart-drawer-title"
                  className="font-serif text-lg font-semibold tracking-tight text-cb-text-strong sm:text-xl"
                >
                  {t("pages.cart.drawerTitle")}
                </h2>
                <p className="text-xs font-medium text-cb-text-muted sm:text-sm">
                  {t("pages.cart.drawerItemsCount", { count: itemCount })}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="cb-touch-manipulation flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cb-border/60 bg-cb-surface text-cb-text-strong transition hover:border-cb-brand-300 hover:bg-cb-peach hover:shadow-sm active:scale-[0.98]"
                aria-label={t("pages.cart.closeDrawer")}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-[max(1.25rem,env(safe-area-inset-left))] py-4 pe-[max(1.25rem,env(safe-area-inset-right))]">
              {lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cb-border bg-cb-surface-2 text-cb-brand-600 shadow-sm">
                    <ShoppingBag className="h-8 w-8" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <p className="font-serif text-lg font-semibold text-cb-text-strong">
                      {t("pages.cart.emptyDrawer")}
                    </p>
                    <p className="max-w-[16rem] text-sm text-cb-text-muted">
                      {t("pages.cart.emptyDrawerHint")}
                    </p>
                  </div>
                  <Link
                    href="/shop"
                    onClick={closeDrawer}
                    className={buttonClassName(
                      "primary",
                      "cb-touch-manipulation inline-flex min-h-[2.75rem] items-center justify-center rounded-full px-6 py-2.5 text-sm font-bold transition hover:-translate-y-px hover:shadow-md active:translate-y-0",
                    )}
                  >
                    {t("pages.cart.startShopping")}
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  <AnimatePresence initial={false}>
                    {lines.map((line) => (
                      <motion.li
                        key={line.productId}
                        layout
                        initial={{ opacity: 0, x: isRtl ? -12 : 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: isRtl ? 16 : -16 }}
                        transition={{ duration: 0.22, ease: easeSoft }}
                      >
                        <div className="cb-cart-drawer__line flex gap-3 rounded-2xl border p-3">
                          <Link
                            href={`/shop/${line.productId}`}
                            onClick={closeDrawer}
                            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cb-peach/50 ring-1 ring-cb-border/50"
                          >
                            <Image
                              src={line.image}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="80px"
                              loading="lazy"
                            />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/shop/${line.productId}`}
                              onClick={closeDrawer}
                              className="line-clamp-2 font-semibold text-cb-text-strong transition hover:text-cb-brand-600"
                            >
                              {line.name}
                            </Link>
                            <p className="mt-0.5 text-sm font-bold text-cb-brand-600">
                              {line.priceEgp} EGP
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                className="cb-cart-drawer__qty-btn cb-touch-manipulation flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition active:scale-[0.97]"
                                aria-label="Decrease quantity"
                                onClick={() => setQuantity(line.productId, line.quantity - 1)}
                              >
                                <Minus className="h-4 w-4" aria-hidden />
                              </button>
                              <span className="min-w-[2rem] text-center text-sm font-bold tabular-nums text-cb-text-strong">
                                {line.quantity}
                              </span>
                              <button
                                type="button"
                                className="cb-cart-drawer__qty-btn cb-touch-manipulation flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition active:scale-[0.97]"
                                aria-label="Increase quantity"
                                onClick={() => setQuantity(line.productId, line.quantity + 1)}
                              >
                                <Plus className="h-4 w-4" aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="cb-touch-manipulation ms-auto flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-red-700 transition hover:border-red-200 hover:bg-red-50 active:scale-[0.97]"
                                aria-label="Remove item"
                                onClick={() => removeItem(line.productId)}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {lines.length > 0 ? (
              <div
                className="cb-cart-drawer__footer sticky bottom-0 z-10 shrink-0 border-t px-[max(1.25rem,env(safe-area-inset-left))] py-4 pe-[max(1.25rem,env(safe-area-inset-right))] backdrop-blur-md"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <FreeDeliveryBar subtotalEgp={subtotalEgp} className="mb-3" variant="drawer" />
                <div className="mb-1 flex items-center justify-between text-cb-text-strong">
                  <span className="text-sm font-semibold">{t("pages.cart.subtotal")}</span>
                  <motion.span
                    key={subtotalEgp}
                    initial={{ opacity: 0.6, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className="font-serif text-xl font-bold text-cb-brand-600"
                  >
                    {subtotalEgp.toFixed(0)} EGP
                  </motion.span>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-cb-text-muted">
                  {t("pages.cart.shippingNote")}
                </p>
                <Link
                  href="/checkout"
                  onClick={closeDrawer}
                  className={buttonClassName(
                    "primary",
                    "cb-touch-manipulation mb-2 block min-h-[3rem] w-full rounded-full py-3 text-center text-base font-bold transition hover:-translate-y-px hover:shadow-lg active:translate-y-0",
                  )}
                >
                  {t("pages.cart.checkout")}
                </Link>
                <Link
                  href="/cart"
                  onClick={closeDrawer}
                  className="block text-center text-sm font-semibold text-cb-brand-600 underline-offset-2 transition hover:text-cb-brand-700 hover:underline"
                >
                  {t("pages.cart.viewFullCart")}
                </Link>
              </div>
            ) : null}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
