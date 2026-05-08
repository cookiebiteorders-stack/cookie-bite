"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useCart } from "@/src/hooks/useCart";
import { QuantitySelector } from "@/src/components/cart/QuantitySelector";
import { buttonClassName } from "@/components/ui/button";

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal, savings, totalItems } = useCart();
  const shipping = subtotal > 120 ? 0 : 15;
  const total = subtotal + shipping;

  return (
    <div className="bg-cb-cream pb-24 pt-10">
      <div className="mx-auto grid max-w-7xl gap-6 cb-gutter lg:grid-cols-[1.65fr_1fr]">
        <section>
          <h1 className="font-serif text-4xl font-semibold text-cb-text-strong">
          Cart
          </h1>
          <p className="mt-2 text-cb-text-muted">
            Review your items and continue to secure checkout.
          </p>

          {items.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-cb-border bg-cb-surface p-10 text-center">
            <p className="text-cb-text">Your cart is empty.</p>
            <Link
              href="/shop"
              className={buttonClassName("primary", "mt-6 inline-flex rounded-full px-8")}
            >
              Shop cookies
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-10 space-y-4">
                {items.map((item) => (
                <li
                    key={item.id}
                  className="flex gap-4 rounded-3xl border border-cb-border bg-cb-surface p-4"
                >
                  <Link
                      href={`/shop/${item.id}`}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-cb-peach/40"
                  >
                    <Image
                        src={item.image}
                        alt={item.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                        href={`/shop/${item.id}`}
                      className="font-semibold text-cb-text-strong hover:text-cb-terracotta-dark"
                    >
                        {item.name}
                    </Link>
                      <p className="text-xs text-cb-text-muted">{item.brand}</p>
                      <p className="text-sm font-bold text-cb-terracotta-dark">
                        ${item.price.toFixed(2)} each
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                        <QuantitySelector
                          quantity={item.quantity}
                          onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
                          onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                        />
                      <button
                        type="button"
                        className="ms-auto text-red-700 hover:underline"
                          onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <p className="shrink-0 font-bold text-cb-text-strong">
                      ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
        </section>

        <aside className="h-fit rounded-2xl border border-cb-border bg-cb-surface p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-cb-text-strong">Order Summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between text-cb-text-muted">
              <span>Items</span>
              <span>{totalItems}</span>
            </div>
            <div className="flex items-center justify-between text-cb-text-muted">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-cb-text-muted">
              <span>Savings</span>
              <span className="text-emerald-600">-${savings.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-cb-text-muted">
              <span>Shipping</span>
              <span>{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-cb-border pt-3 text-base font-bold text-cb-text-strong">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          <Link href="/checkout" className={buttonClassName("primary", "mt-5 w-full rounded-md text-center")}>
            Checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}
