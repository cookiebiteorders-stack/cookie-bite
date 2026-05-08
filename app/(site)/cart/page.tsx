"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { FreeDeliveryBar } from "@/components/cart/free-delivery-bar";
import { buttonClassName } from "@/components/ui/button";

export default function CartPage() {
  const { lines, setQuantity, removeItem, subtotalEgp } = useCart();

  return (
    <div className="bg-cb-cream pb-24 pt-10">
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <h1 className="font-serif text-4xl font-semibold text-cb-text-strong">
          Cart
        </h1>
        <p className="mt-2 text-cb-text-muted">
          Review your box before checkout — prices are confirmed on the next step.
        </p>

        {lines.length === 0 ? (
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
              {lines.map((line) => (
                <li
                  key={line.productId}
                  className="flex gap-4 rounded-3xl border border-cb-border bg-cb-surface p-4"
                >
                  <Link
                    href={`/shop/${line.productId}`}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-cb-peach/40"
                  >
                    <Image
                      src={line.image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/shop/${line.productId}`}
                      className="font-semibold text-cb-text-strong hover:text-cb-terracotta-dark"
                    >
                      {line.name}
                    </Link>
                    <p className="text-sm font-bold text-cb-terracotta-dark">
                      {line.priceEgp} EGP each
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-cb-border p-1.5 hover:bg-cb-peach"
                        aria-label="Decrease"
                        onClick={() => setQuantity(line.productId, line.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{line.quantity}</span>
                      <button
                        type="button"
                        className="rounded-lg border border-cb-border p-1.5 hover:bg-cb-peach"
                        aria-label="Increase"
                        onClick={() => setQuantity(line.productId, line.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="ms-auto text-red-700 hover:underline"
                        onClick={() => removeItem(line.productId)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <p className="shrink-0 font-bold text-cb-text-strong">
                    {(line.priceEgp * line.quantity).toFixed(0)} EGP
                  </p>
                </li>
              ))}
            </ul>

            <FreeDeliveryBar subtotalEgp={subtotalEgp} className="mt-8" />

            <div className="mt-6 flex items-center justify-between border-t border-cb-border pt-6">
              <span className="text-lg font-semibold text-cb-text-strong">Subtotal</span>
              <span className="font-serif text-2xl font-bold text-cb-terracotta-dark">
                {subtotalEgp.toFixed(0)} EGP
              </span>
            </div>

            <Link
              href="/checkout"
              className={buttonClassName("primary", "mt-8 block w-full rounded-full py-4 text-center")}
            >
              Proceed to checkout
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
