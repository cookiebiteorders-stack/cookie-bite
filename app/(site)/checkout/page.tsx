"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPaymentMethodSummary } from "@/lib/account/payment-method-display";
import type { PaymentMethodType } from "@/lib/account/payment-method-schema";
import type { SavedPaymentMethodRow } from "@/lib/db/payment-methods";
import { useCart } from "@/components/providers/cart-provider";
import { FreeDeliveryBar } from "@/components/cart/free-delivery-bar";
import { PromoCodeField } from "@/components/checkout/promo-code-field";
import { buttonClassName } from "@/components/ui/button";
import { DeliveryScheduler } from "@/components/checkout/delivery-scheduler";
import { stashPendingPurchaseEvents } from "@/components/checkout/purchase-events-tracker";
import { useLanguage } from "@/components/providers/language-provider";
import {
  emptyDeliveryScheduling,
  stateToPayload,
  validateDeliverySchedulingClient,
  type DeliverySchedulingState,
} from "@/lib/checkout/delivery-scheduling";
import { siteConfig } from "@/lib/site-config";
import {
  buildSnapshotFromCartLine,
  type GiftBoxCartBuilderPayload,
} from "@/lib/gift-box/order-snapshot";

const GIFT_WRAP_FEE_EGP = 30;

type Step = 1 | 2 | 3;

const OFFLINE_PAYMENT_METHODS = new Set<PaymentMethodType>(["cod", "instapay", "fawry"]);

export default function CheckoutPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { lang, t, formatPrice } = useLanguage();
  const { lines, subtotalEgp, discountEgp, itemCount, clearCart, promo, applyPromo, clearPromo } =
    useCart();
  const [step, setStep] = useState<Step>(1);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState(lang === "ar" ? "القاهرة الجديدة" : "New Cairo");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<PaymentMethodType>("cod");
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethodRow[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<DeliverySchedulingState>(emptyDeliveryScheduling);
  const giftBoxLine = lines.find((l) => Boolean(l.giftBox));
  const regularLines = lines.filter((l) => !l.giftBox);

  useEffect(() => {
    if (itemCount === 0) {
      router.replace("/cart");
    }
  }, [itemCount, router]);

  useEffect(() => {
    if (!isSignedIn) {
      setSavedMethods([]);
      setSelectedSavedId(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/payment-methods");
        if (!res.ok) return;
        const data = (await res.json()) as { methods?: SavedPaymentMethodRow[] };
        if (cancelled) return;
        const methods = data.methods ?? [];
        setSavedMethods(methods);
        const preferred = methods.find((m) => m.is_default) ?? methods[0];
        if (preferred) {
          setPayment(preferred.method_type);
          setSelectedSavedId(preferred.id);
        }
      } catch {
        /* ignore — guest-style checkout still works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  async function onPaymobPrepare() {
    const giftBoxSnapshot = giftBoxLine
      ? buildSnapshotFromCartLine(
          giftBoxLine,
          giftBoxLine.giftBox?.builder as GiftBoxCartBuilderPayload | undefined,
        )
      : null;
    if (giftBoxLine && !giftBoxSnapshot) {
      setErrorMsg(t("pages.checkout.errGiftBox"));
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/checkout/paymob/intention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: regularLines.map((l) => ({
            id: l.productId,
            quantity: l.quantity,
            addons: l.addons,
          })),
          ...(giftBoxSnapshot ? { gift_box: giftBoxSnapshot } : {}),
          shipping: { name, email, phone, address, city, notes },
          paymentMethod: payment,
          promo_code: promo?.code,
          delivery: stateToPayload(delivery),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(
          (typeof data.error_ar === "string" && lang === "ar" && data.error_ar) ||
            (typeof data.error === "string" && data.error) ||
            t("pages.checkout.errPayment"),
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
      if (
        typeof data.paymentMethod === "string" &&
        OFFLINE_PAYMENT_METHODS.has(data.paymentMethod as PaymentMethodType)
      ) {
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
        typeof data.message === "string" ? data.message : t("pages.checkout.errPaymob"),
      );
      setStatus("error");
    } catch {
      setErrorMsg(t("pages.checkout.errNetwork"));
      setStatus("error");
    }
  }

  if (itemCount === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-cb-cream px-4">
        <p className="text-cb-text-muted">{t("pages.checkout.redirecting")}</p>
      </div>
    );
  }

  const deliveryFee =
    subtotalEgp >= siteConfig.freeDeliveryThresholdEgp
      ? 0
      : siteConfig.standardDeliveryFeeEgp;
  const giftWrapFee = delivery.isGift || giftBoxLine ? GIFT_WRAP_FEE_EGP : 0;
  const total = Math.max(0, subtotalEgp - discountEgp + deliveryFee + giftWrapFee);

  const steps = [
    t("pages.checkout.stepShipping"),
    t("pages.checkout.stepPayment"),
    t("pages.checkout.stepReview"),
  ];

  const paymentOptions = [
    ["cod", t("pages.checkout.payCod")],
    ["card", t("pages.checkout.payCard")],
    ["wallet", t("pages.checkout.payWallet")],
    ["instapay", t("pages.checkout.payInstapay")],
    ["fawry", t("pages.checkout.payFawry")],
  ] as const;

  function selectSavedMethod(method: SavedPaymentMethodRow) {
    setSelectedSavedId(method.id);
    setPayment(method.method_type);
  }

  function selectGenericMethod(value: PaymentMethodType) {
    setSelectedSavedId(null);
    setPayment(value);
  }

  return (
    <div className="bg-cb-cream pb-24 pt-10" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-2xl px-4 lg:px-6">
        <h1 className="font-serif text-4xl font-semibold text-cb-text-strong">
          {t("pages.checkout.title")}
        </h1>
        <ol className="mt-6 flex flex-wrap gap-x-2 gap-y-1 text-xs font-bold uppercase tracking-wide text-cb-text-muted">
          {steps.map((label, i) => (
            <li
              key={label}
              className={
                step > i + 1
                  ? "text-cb-terracotta-dark"
                  : step === i + 1
                    ? "text-cb-text-strong"
                    : ""
              }
            >
              {i + 1}. {label}
              {i < steps.length - 1 ? (
                <span className="mx-1 text-cb-text-muted/60" aria-hidden>
                  ·
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <form
            className="mt-8 space-y-4 text-start"
            onSubmit={(e) => {
              e.preventDefault();
              const deliveryErr = validateDeliverySchedulingClient(delivery, lang);
              if (deliveryErr) {
                setErrorMsg(deliveryErr);
                setStatus("error");
                return;
              }
              setErrorMsg(null);
              setStatus("idle");
              setStep(2);
            }}
          >
            <div>
              <label className="mb-1 block text-sm font-semibold text-cb-text-strong">
                {t("pages.checkout.fullName")}
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
                {t("pages.checkout.email")}
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder={t("pages.checkout.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3 text-sm outline-none focus-visible:border-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-cb-text-strong">
                {t("pages.checkout.phone")}
              </label>
              <input
                required
                inputMode="tel"
                placeholder={t("pages.checkout.phonePlaceholder")}
                pattern="^01[0125][0-9]{8}$"
                title={t("pages.checkout.phoneTitle")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3 text-sm outline-none focus-visible:border-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-cb-text-strong">
                {t("pages.checkout.address")}
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
                {t("pages.checkout.city")}
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
                {t("pages.checkout.notes")}
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3 text-sm outline-none focus-visible:border-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus"
              />
            </div>
            <DeliveryScheduler value={delivery} onChange={setDelivery} className="mt-2" />
            {errorMsg && step === 1 ? (
              <p className="text-sm font-semibold text-red-700" role="alert">
                {errorMsg}
              </p>
            ) : null}
            <button type="submit" className={buttonClassName("primary", "w-full rounded-full py-4")}>
              {t("pages.checkout.continuePayment")}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="mt-8 space-y-4 text-start">
            <p className="text-sm text-cb-text">{t("pages.checkout.paymentIntro")}</p>
            {savedMethods.length ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-cb-text-muted">
                    {t("pages.checkout.savedMethodsTitle")}
                  </p>
                  <Link
                    href="/account/payment-methods"
                    className="text-xs font-semibold text-cb-terracotta-dark hover:underline"
                  >
                    {t("pages.checkout.manageSavedMethods")}
                  </Link>
                </div>
                <fieldset className="space-y-3">
                  <legend className="sr-only">{t("pages.checkout.savedMethodsTitle")}</legend>
                  {savedMethods.map((method) => (
                    <label
                      key={method.id}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3 has-[:checked]:border-cb-terracotta-dark"
                    >
                      <input
                        type="radio"
                        name="pay-saved"
                        checked={selectedSavedId === method.id}
                        onChange={() => selectSavedMethod(method)}
                        className="h-4 w-4 shrink-0 accent-cb-terracotta-dark"
                      />
                      <span className="font-semibold text-cb-text-strong">
                        {formatPaymentMethodSummary(method, t)}
                      </span>
                    </label>
                  ))}
                </fieldset>
              </div>
            ) : null}
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-wide text-cb-text-muted">
                {savedMethods.length
                  ? t("pages.checkout.otherPaymentTitle")
                  : t("pages.checkout.paymentLegend")}
              </legend>
              {paymentOptions.map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3 has-[:checked]:border-cb-terracotta-dark"
                >
                  <input
                    type="radio"
                    name="pay"
                    value={value}
                    checked={selectedSavedId === null && payment === value}
                    onChange={() => selectGenericMethod(value)}
                    className="h-4 w-4 shrink-0 accent-cb-terracotta-dark"
                  />
                  <span className="font-semibold text-cb-text-strong">{label}</span>
                </label>
              ))}
            </fieldset>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={buttonClassName("outline", "flex-1 rounded-full py-3")}
              >
                {t("pages.checkout.back")}
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className={buttonClassName("primary", "flex-1 rounded-full py-3")}
              >
                {t("pages.checkout.reviewOrder")}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-8 space-y-6 text-start">
            <div className="rounded-3xl border border-cb-border bg-cb-surface p-6">
              <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
                {t("pages.checkout.summary")}
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-cb-text">
                {lines.map((l) => (
                  <li key={l.id} className="flex justify-between gap-3">
                    <span>
                      {l.name} × {l.quantity}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatPrice(l.finalUnitPriceEgp * l.quantity)}
                    </span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-cb-border pt-2">
                  <span>{t("pages.checkout.discount")}</span>
                  <span className="text-emerald-700">
                    {discountEgp > 0
                      ? `−${formatPrice(discountEgp)}`
                      : t("pages.checkout.dash")}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>{t("pages.checkout.delivery")}</span>
                  <span>
                    {deliveryFee === 0
                      ? t("pages.checkout.free")
                      : formatPrice(deliveryFee)}
                  </span>
                </li>
                {giftWrapFee > 0 ? (
                  <li className="flex justify-between">
                    <span>{t("pages.checkout.giftWrap")}</span>
                    <span>{formatPrice(giftWrapFee)}</span>
                  </li>
                ) : null}
                {delivery.deliveryDate && delivery.slotLabel ? (
                  <li className="flex justify-between text-xs text-cb-text-muted">
                    <span>{t("pages.checkout.scheduled")}</span>
                    <span>
                      {delivery.deliveryDate} · {delivery.slotLabel}
                    </span>
                  </li>
                ) : null}
                <li className="flex justify-between font-serif text-lg font-bold text-cb-terracotta-dark">
                  <span>{t("pages.checkout.total")}</span>
                  <span className="tabular-nums">{formatPrice(total)}</span>
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
                {t("pages.checkout.back")}
              </button>
              <button
                type="button"
                disabled={status === "loading" || itemCount === 0}
                onClick={onPaymobPrepare}
                className={buttonClassName("primary", "flex-1 rounded-full py-3")}
              >
                {status === "loading"
                  ? t("pages.checkout.processing")
                  : OFFLINE_PAYMENT_METHODS.has(payment)
                    ? t("pages.checkout.placeOrderCod")
                    : t("pages.checkout.payPaymob")}
              </button>
            </div>
            {OFFLINE_PAYMENT_METHODS.has(payment) && step === 3 ? (
              <p className="text-center text-xs text-cb-text-muted">{t("pages.checkout.codNote")}</p>
            ) : null}
          </div>
        )}

        <p className="mt-10 text-center text-sm">
          <Link href="/cart" className="font-semibold text-cb-terracotta-dark hover:underline">
            {t("pages.checkout.backToCart")}
          </Link>
        </p>
      </div>
    </div>
  );
}
