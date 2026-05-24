"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/providers/cart-provider";
import { FreeDeliveryBar } from "@/components/cart/free-delivery-bar";
import { PromoCodeField } from "@/components/checkout/promo-code-field";
import { buttonClassName } from "@/components/ui/button";
import { stashPendingPurchaseEvents } from "@/components/checkout/purchase-events-tracker";
import { siteConfig } from "@/lib/site-config";

type Step = 1 | 2 | 3;

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotalEgp, discountEgp, itemCount, clearCart, promo, applyPromo, clearPromo } =
    useCart();
  const [step, setStep] = useState<Step>(1);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("New Cairo");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<"card" | "wallet" | "cod">("cod");

  useEffect(() => {
    if (itemCount === 0) {
      router.replace("/cart");
    }
  }, [itemCount, router]);

  async function onPaymobPrepare() {
    setStatus("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/checkout/paymob/intention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ id: l.productId, quantity: l.quantity })),
          shipping: { name, email, phone, address, city, notes },
          paymentMethod: payment,
          promo_code: promo?.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(
          (typeof data.error_ar === "string" && data.error_ar) ||
            data.error ||
            "Payment setup failed",
        );
        setStatus("error");
        return;
      }
      if (data.configured && data.paymentUrl) {
        stashPendingPurchaseEvents(
          lines
            .filter((l) => l.productUuid)
            .map((l) => ({ product_id: l.productUuid!, quantity: l.quantity })),
        );
        window.location.href = data.paymentUrl as string;
        return;
      }
      if (data.paymentMethod === "cod") {
        const oid =
          typeof data.orderId === "string" && data.orderId.length > 0
            ? data.orderId
            : "demo";
        stashPendingPurchaseEvents(
          lines
            .filter((l) => l.productUuid)
            .map((l) => ({ product_id: l.productUuid!, quantity: l.quantity })),
        );
        clearCart();
        router.push(`/checkout/thank-you?order=${encodeURIComponent(oid)}`);
        return;
      }
      setErrorMsg(
        typeof data.message === "string"
          ? data.message
          : "Paymob is not fully configured yet — use cash on delivery for now.",
      );
      setStatus("error");
    } catch {
      setErrorMsg("Network error");
      setStatus("error");
    }
  }

  if (itemCount === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-cb-cream px-4">
        <p className="text-cb-text-muted">Redirecting to cart…</p>
      </div>
    );
  }

  const deliveryFee =
    subtotalEgp >= siteConfig.freeDeliveryThresholdEgp
      ? 0
      : siteConfig.standardDeliveryFeeEgp;
  const total = Math.max(0, subtotalEgp - discountEgp + deliveryFee);

  return (
    <div className="bg-cb-cream pb-24 pt-10">
      <div className="mx-auto max-w-2xl px-4 lg:px-6">
        <h1 className="font-serif text-4xl font-semibold text-cb-text-strong">
          Checkout
        </h1>
        <ol className="mt-6 flex gap-2 text-xs font-bold uppercase tracking-wide text-cb-text-muted">
          {[
            ["1", "Shipping"],
            ["2", "Payment"],
            ["3", "Review"],
          ].map(([n, label], i) => (
            <li
              key={n}
              className={
                step > i
                  ? "text-cb-terracotta-dark"
                  : step === i + 1
                    ? "text-cb-text-strong"
                    : ""
              }
            >
              {n}. {label}
              {i < 2 ? " · " : ""}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setStep(2);
            }}
          >
            <div>
              <label className="mb-1 block text-sm font-semibold text-cb-text-strong">
                Full name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3 text-sm outline-none focus-visible:border-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-cb-text-strong">
                Email (optional — for order confirmation)
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3 text-sm outline-none focus-visible:border-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-cb-text-strong">
                Phone (Egypt)
              </label>
              <input
                required
                inputMode="tel"
                placeholder="01xxxxxxxxx"
                pattern="^01[0125][0-9]{8}$"
                title="11-digit Egyptian mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3 text-sm outline-none focus-visible:border-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-cb-text-strong">
                Address
              </label>
              <textarea
                required
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3 text-sm outline-none focus-visible:border-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-cb-text-strong">
                City / area
              </label>
              <input
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3 text-sm outline-none focus-visible:border-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-cb-text-strong">
                Order notes (optional)
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3 text-sm outline-none focus-visible:border-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus"
              />
            </div>
            <button type="submit" className={buttonClassName("primary", "w-full rounded-full py-4")}>
              Continue to payment
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-cb-text">
              Choose how you&apos;d like to pay. Paymob (card / wallet) goes live once keys are set in{" "}
              <code className="rounded bg-cb-peach px-1">.env</code>.
            </p>
            <fieldset className="space-y-3">
              <legend className="sr-only">Payment method</legend>
              {(
                [
                  ["cod", "Cash on delivery"],
                  ["card", "Card (Paymob)"],
                  ["wallet", "Mobile wallet (Paymob)"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3 has-[:checked]:border-cb-terracotta-dark"
                >
                  <input
                    type="radio"
                    name="pay"
                    value={value}
                    checked={payment === value}
                    onChange={() => setPayment(value)}
                    className="h-4 w-4 accent-cb-terracotta-dark"
                  />
                  <span className="font-semibold text-cb-text-strong">{label}</span>
                </label>
              ))}
            </fieldset>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={buttonClassName("outline", "flex-1 rounded-full py-3")}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className={buttonClassName("primary", "flex-1 rounded-full py-3")}
              >
                Review order
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-8 space-y-6">
            <div className="rounded-3xl border border-cb-border bg-cb-surface p-6">
              <h2 className="font-serif text-lg font-semibold text-cb-text-strong">Summary</h2>
              <ul className="mt-4 space-y-2 text-sm text-cb-text">
                {lines.map((l) => (
                  <li key={l.productId} className="flex justify-between">
                    <span>
                      {l.name} × {l.quantity}
                    </span>
                    <span className="font-semibold">
                      {(l.priceEgp * l.quantity).toFixed(0)} EGP
                    </span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-cb-border pt-2">
                  <span>Discount</span>
                  <span className="text-emerald-700">
                    {discountEgp > 0 ? `−${discountEgp.toFixed(0)} EGP` : "—"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? "Free" : `${deliveryFee} EGP`}</span>
                </li>
                <li className="flex justify-between font-serif text-lg font-bold text-cb-terracotta-dark">
                  <span>Total</span>
                  <span>{total.toFixed(0)} EGP</span>
                </li>
              </ul>
              <FreeDeliveryBar subtotalEgp={subtotalEgp} className="mt-4" />
              <PromoCodeField
                cartSubtotal={subtotalEgp}
                applied={promo}
                onApply={applyPromo}
                onClear={clearPromo}
                className="mt-4"
              />
            </div>
            <p className="text-sm text-cb-text-muted">
              {name} · {phone} · {address}, {city}
            </p>
            {errorMsg ? (
              <p className="text-sm font-semibold text-red-700" role="alert">
                {errorMsg}
              </p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep(2)}
                className={buttonClassName("outline", "flex-1 rounded-full py-3")}
              >
                Back
              </button>
              <button
                type="button"
                disabled={status === "loading"}
                onClick={onPaymobPrepare}
                className={buttonClassName("primary", "flex-1 rounded-full py-3")}
              >
                {status === "loading" ? "Processing…" : payment === "cod" ? "Place order (COD)" : "Pay with Paymob"}
              </button>
            </div>
            {payment === "cod" && step === 3 ? (
              <p className="text-center text-xs text-cb-text-muted">
                COD order is saved instantly. Our team will confirm by WhatsApp or email.
              </p>
            ) : null}
          </div>
        )}

        <p className="mt-10 text-center text-sm">
          <Link href="/cart" className="font-semibold text-cb-terracotta-dark hover:underline">
            ← Back to cart
          </Link>
        </p>
      </div>
    </div>
  );
}
