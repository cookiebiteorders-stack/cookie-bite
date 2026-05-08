"use client";

import Image from "next/image";
import Link from "next/link";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { FreeDeliveryBar } from "@/components/cart/free-delivery-bar";
import { buttonClassName } from "@/components/ui/button";
export function CartDrawer() {
  const {
    lines,
    isDrawerOpen,
    closeDrawer,
    setQuantity,
    removeItem,
    subtotalEgp,
  } = useCart();

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="cb-touch-manipulation absolute inset-0 bg-black/40 backdrop-blur-[2px] max-sm:bg-black/50 max-sm:backdrop-blur-none"
        aria-label="Close cart"
        onClick={closeDrawer}
      />
      <aside
        className="relative flex h-full max-h-[100dvh] w-full max-w-md flex-col border-l border-cb-border bg-cb-cream shadow-2xl dark:bg-cb-cream-2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        <div
          className="flex items-center justify-between border-b border-cb-peach-deep px-[max(1.25rem,env(safe-area-inset-left))] py-4 pe-[max(1.25rem,env(safe-area-inset-right))] dark:border-cb-border/50"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <h2 id="cart-drawer-title" className="font-serif text-lg font-semibold text-cb-text-strong sm:text-xl">
            Your cart
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="cb-touch-manipulation flex h-11 w-11 items-center justify-center rounded-full text-cb-text hover:bg-cb-peach dark:hover:bg-cb-peach/25"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-[max(1.25rem,env(safe-area-inset-left))] py-4 pe-[max(1.25rem,env(safe-area-inset-right))]">
          {lines.length === 0 ? (
            <p className="text-center text-sm text-cb-text-muted">
              Your cart is empty — add something sweet from the shop.
            </p>
          ) : (
            <ul className="space-y-4">
              {lines.map((line) => (
                <li
                  key={line.productId}
                  className="flex gap-3 rounded-2xl border border-cb-border bg-cb-surface p-3"
                >
                  <Link
                    href={`/shop/${line.productId}`}
                    onClick={closeDrawer}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cb-peach/40"
                  >
                    <Image
                      src={line.image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/shop/${line.productId}`}
                      onClick={closeDrawer}
                      className="font-semibold text-cb-text-strong hover:text-cb-terracotta-dark"
                    >
                      {line.name}
                    </Link>
                    <p className="text-sm font-bold text-cb-terracotta-dark">
                      {line.priceEgp} EGP
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="cb-touch-manipulation flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cb-border bg-cb-cream hover:bg-cb-peach dark:bg-cb-surface-2 dark:hover:bg-cb-peach/30"
                        aria-label="Decrease quantity"
                        onClick={() => setQuantity(line.productId, line.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[2.25rem] text-center text-base font-bold tabular-nums">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        className="cb-touch-manipulation flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cb-border bg-cb-cream hover:bg-cb-peach dark:bg-cb-surface-2 dark:hover:bg-cb-peach/30"
                        aria-label="Increase quantity"
                        onClick={() => setQuantity(line.productId, line.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="cb-touch-manipulation ms-auto flex h-11 w-11 items-center justify-center rounded-lg text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        aria-label="Remove item"
                        onClick={() => removeItem(line.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 ? (
          <div
            className="border-t border-cb-peach-deep bg-cb-surface-2 px-[max(1.25rem,env(safe-area-inset-left))] py-4 pe-[max(1.25rem,env(safe-area-inset-right))] dark:border-cb-border/50"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <FreeDeliveryBar subtotalEgp={subtotalEgp} className="mb-4" />
            <div className="mb-4 flex items-center justify-between text-cb-text-strong">
              <span className="font-semibold">Subtotal</span>
              <span className="font-serif text-xl font-bold text-cb-terracotta-dark">
                {subtotalEgp.toFixed(0)} EGP
              </span>
            </div>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className={buttonClassName(
                "primary",
                "cb-touch-manipulation mb-2 block min-h-[3rem] w-full rounded-full py-3 text-center text-base",
              )}
            >
              Checkout
            </Link>
            <Link
              href="/cart"
              onClick={closeDrawer}
              className="block text-center text-sm font-semibold text-cb-terracotta-dark hover:underline"
            >
              View full cart
            </Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
