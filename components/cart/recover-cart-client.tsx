"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/providers/cart-provider";
import { buttonClassName } from "@/components/ui/button";
import type { AbandonedCartSnapshot } from "@/lib/cart/abandoned";
import type { CartLine } from "@/lib/cart/types";

type Props = {
  token: string;
  cartSnapshot: AbandonedCartSnapshot;
  discountCode: string | null;
};

export function RecoverCartClient({ token, cartSnapshot, discountCode }: Props) {
  const router = useRouter();
  const { restoreCart } = useCart();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const lines = (cartSnapshot.lines ?? []) as CartLine[];
  const total = Number(cartSnapshot.subtotalEgp ?? 0);

  async function onRestore() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/cart/recover/${encodeURIComponent(token)}`, {
        method: "POST",
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      await restoreCart(lines, discountCode);
      router.push("/cart");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-[70vh] bg-cb-cream px-4 py-16">
      <div className="mx-auto max-w-md rounded-3xl bg-cb-surface p-8 text-center shadow-sm ring-1 ring-cb-border">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-cb-peach text-4xl">
          🍪
        </div>

        <h1 className="mt-6 font-serif text-2xl font-semibold text-cb-text-strong">
          Your cart is waiting!
        </h1>
        <p className="mt-2 text-sm text-cb-text-muted">
          {lines.length} item{lines.length === 1 ? "" : "s"} ready to checkout
        </p>

        <ul className="mt-6 space-y-2 rounded-2xl bg-cb-cream p-4 text-start text-sm">
          {lines.map((line) => (
            <li key={line.id} className="flex justify-between gap-3 text-cb-text">
              <span className="min-w-0 truncate">
                {line.name} × {line.quantity}
              </span>
              <span className="shrink-0 font-semibold text-cb-text-strong">
                {(line.finalUnitPriceEgp * line.quantity).toFixed(0)} EGP
              </span>
            </li>
          ))}
          <li className="flex justify-between border-t border-cb-border pt-2 font-bold text-cb-terracotta-dark">
            <span>Total</span>
            <span>{total.toFixed(0)} EGP</span>
          </li>
        </ul>

        {discountCode ? (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-cb-terracotta-dark/40 bg-cb-peach/30 p-4">
            <p className="text-xs text-cb-text-muted">Exclusive 10% off — valid 48 hours</p>
            <p className="mt-1 font-mono text-xl font-bold tracking-widest text-cb-terracotta-dark">
              {discountCode}
            </p>
          </div>
        ) : null}

        {status === "error" ? (
          <p className="mt-4 text-sm font-semibold text-red-700" role="alert">
            Could not restore cart — try again or shop fresh.
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            disabled={status === "loading"}
            onClick={() => void onRestore()}
            className={buttonClassName("primary", "w-full rounded-full py-3")}
          >
            {status === "loading" ? "Restoring…" : "Restore my cart"}
          </button>
          <Link
            href="/shop"
            className={buttonClassName("outline", "w-full rounded-full py-3 text-center")}
          >
            Browse shop
          </Link>
        </div>
      </div>
    </div>
  );
}
