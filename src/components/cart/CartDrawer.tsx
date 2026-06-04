"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Trash2, X } from "lucide-react";
import { useCart } from "@/src/hooks/useCart";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { QuantitySelector } from "@/src/components/cart/QuantitySelector";
import { buttonClassName } from "@/components/ui/button";

export function CartDrawer() {
  const {
    items,
    isDrawerOpen,
    closeDrawer,
    removeItem,
    updateQuantity,
    subtotal,
    savings,
    totalItems,
  } = useCart();
  useLockBodyScroll(isDrawerOpen);

  return (
    <AnimatePresence>
      {isDrawerOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[85]"
          role="dialog"
          aria-modal="true"
          aria-label="Shopping cart drawer"
        >
          <button
            type="button"
            className="absolute inset-0 bg-cb-scrim-strong/65"
            aria-label="Close cart"
            onClick={closeDrawer}
          />
          <motion.aside
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-[min(100vw,28rem)] flex-col border-l border-cb-border bg-cb-surface sm:max-w-lg"
          >
            <header className="sticky top-0 flex items-center justify-between border-b border-cb-border px-4 py-3">
              <h2 className="font-layout-heading text-lg font-semibold text-cb-text-strong">
                Cart ({totalItems})
              </h2>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-cb-border hover:bg-cb-hover-overlay"
                onClick={closeDrawer}
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="mt-12 text-center">
                  <p className="text-base font-semibold text-cb-text-strong">Your cart is empty</p>
                  <p className="mt-2 text-sm text-cb-text-muted">
                    Looks like you have not added anything yet.
                  </p>
                  <Link href="/shop" className={buttonClassName("primary", "mt-5")} onClick={closeDrawer}>
                    Browse Products
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-lg border border-cb-border p-3"
                    >
                      <div className="flex gap-3">
                        <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-cb-cream">
                          <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-cb-text-strong">{item.name}</p>
                          <p className="mt-1 text-xs text-cb-text-muted">{item.brand}</p>
                          <p className="mt-1 text-sm font-bold text-cb-terracotta-dark">
                            ${item.price.toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-500/10"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3">
                        <QuantitySelector
                          quantity={item.quantity}
                          onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
                          onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                        />
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="sticky bottom-0 border-t border-cb-border bg-cb-surface p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-cb-text-muted">Subtotal</span>
                <span className="font-semibold text-cb-text-strong">${subtotal.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-cb-text-muted">You save</span>
                <span className="font-semibold text-cb-success">${savings.toFixed(2)}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" className={buttonClassName("outline", "rounded-md")} onClick={closeDrawer}>
                  Continue
                </button>
                <Link href="/cart" className={buttonClassName("primary", "rounded-md text-center")} onClick={closeDrawer}>
                  Checkout
                </Link>
              </div>
            </footer>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

