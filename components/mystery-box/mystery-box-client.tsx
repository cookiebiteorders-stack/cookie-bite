"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, RefreshCw, Shuffle, Sparkles } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import {
  FALLBACK_MYSTERY_RULES,
  getBudgetTiersForOccasion,
  getOccasionsFromRules,
} from "@/lib/mystery-box/budget-tiers";
import type {
  MysteryBoxGenerateResult,
  MysteryBoxRule,
  MysteryOccasion,
} from "@/lib/mystery-box/types";
import { cn } from "@/lib/utils";
import "./mystery-box.css";

const OCCASION_META: Record<
  MysteryOccasion,
  { labelKey: string; emoji: string }
> = {
  birthday: { labelKey: "pages.mysteryBox.occasionBirthday", emoji: "🎂" },
  ramadan: { labelKey: "pages.mysteryBox.occasionRamadan", emoji: "🌙" },
  thanks: { labelKey: "pages.mysteryBox.occasionThanks", emoji: "🙏" },
  corporate: { labelKey: "pages.mysteryBox.occasionCorporate", emoji: "🏢" },
  wedding: { labelKey: "pages.mysteryBox.occasionWedding", emoji: "💍" },
};

const ALL_OCCASIONS: MysteryOccasion[] = [
  "birthday",
  "ramadan",
  "thanks",
  "corporate",
  "wedding",
];

type MysteryBoxClientProps = {
  initialRules?: MysteryBoxRule[];
};

export function MysteryBoxClient({ initialRules }: MysteryBoxClientProps) {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const { addGiftBoxItem, openDrawer } = useCart();
  const resultRef = useRef<HTMLDivElement | null>(null);

  const [rules, setRules] = useState<MysteryBoxRule[]>(
    initialRules?.length ? initialRules : FALLBACK_MYSTERY_RULES,
  );
  const [rulesReady, setRulesReady] = useState(Boolean(initialRules?.length));

  const [occasion, setOccasion] = useState<MysteryOccasion>("birthday");
  const [budget, setBudget] = useState<number>(0);
  const [preferences, setPreferences] = useState("");
  const [result, setResult] = useState<MysteryBoxGenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableOccasions = useMemo(
    () => getOccasionsFromRules(rules),
    [rules],
  );

  const budgetTiers = useMemo(
    () => getBudgetTiersForOccasion(rules, occasion),
    [rules, occasion],
  );

  const canGenerate = Boolean(occasion && budget > 0 && rulesReady);

  useEffect(() => {
    if (initialRules?.length) return;
    let cancelled = false;
    void fetch("/api/mystery-box/rules", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data: { rules?: MysteryBoxRule[] }) => {
        if (cancelled) return;
        if (Array.isArray(data.rules) && data.rules.length > 0) {
          setRules(data.rules);
        }
        setRulesReady(true);
      })
      .catch(() => {
        if (!cancelled) setRulesReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [initialRules?.length]);

  useEffect(() => {
    const fromUrl = searchParams.get("occasion");
    if (
      fromUrl &&
      ALL_OCCASIONS.includes(fromUrl as MysteryOccasion) &&
      availableOccasions.includes(fromUrl as MysteryOccasion)
    ) {
      setOccasion(fromUrl as MysteryOccasion);
    } else if (
      availableOccasions.length &&
      !availableOccasions.includes(occasion)
    ) {
      setOccasion(availableOccasions[0]);
    }
  }, [searchParams, availableOccasions, occasion]);

  useEffect(() => {
    if (budgetTiers.length > 0) {
      setBudget(budgetTiers[0].amount);
    } else {
      setBudget(0);
    }
    setResult(null);
    setAdded(false);
    setError(null);
  }, [occasion, budgetTiers]);

  const generate = useCallback(async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAdded(false);
    try {
      const res = await fetch("/api/mystery-box/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion,
          budget,
          preferences: preferences.trim() || undefined,
          lang,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        box?: MysteryBoxGenerateResult;
        error?: { en?: string; ar?: string };
      } | null;

      if (!res.ok || !data?.box) {
        const fallback =
          res.status === 404
            ? t("pages.mysteryBox.errNoRule")
            : res.status === 503
              ? t("pages.mysteryBox.errNoProducts")
              : res.status === 422
                ? t("pages.mysteryBox.errBuild")
                : t("pages.mysteryBox.errGenerate");
        setError(
          (lang === "ar" ? data?.error?.ar : data?.error?.en) ?? fallback,
        );
        return;
      }

      setResult(data.box);
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      setError(t("pages.mysteryBox.errNetwork"));
    } finally {
      setLoading(false);
    }
  }, [canGenerate, occasion, budget, preferences, lang, t]);

  function addToCart() {
    if (!result) return;
    const coverImage =
      result.items.find((i) => i.imageUrl)?.imageUrl ??
      "/brand/gift-box/box-closed-ref.png";

    addGiftBoxItem({
      id: crypto.randomUUID(),
      name: t("pages.mysteryBox.title"),
      image: coverImage,
      boxSize: result.boxSize,
      selectedProducts: result.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        price_snapshot: item.unitPrice,
        name: item.name,
        image: item.imageUrl,
      })),
      message: preferences.trim() || result.description,
      totalPrice: result.totalPrice,
      builder: {
        mystery: true,
        occasion: result.occasion,
        budget: result.budget,
        preferences,
        items: Object.fromEntries(
          result.items.map((i) => [i.productId, i.quantity]),
        ),
      },
    });
    setAdded(true);
    openDrawer();
  }

  const BackArrow = lang === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="mystery-page min-h-[75vh] py-10 md:py-16">
      <div className="mx-auto max-w-2xl space-y-8 cb-gutter">
        <Link
          href="/gift-box"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-cb-terracotta-dark hover:underline"
        >
          <BackArrow className="h-4 w-4" aria-hidden />
          {t("pages.mysteryBox.backToGifts")}
        </Link>

        <div className="mystery-hero">
          <div className="mystery-hero__icon" aria-hidden>
            🎁
          </div>
          <h1 className="mt-4 font-serif text-3xl font-semibold text-cb-text-strong sm:text-4xl">
            {t("pages.mysteryBox.title")}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-cb-text-muted sm:text-base">
            {t("pages.mysteryBox.subtitle")}
          </p>
        </div>

        <div>
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-cb-terracotta-dark">
            {t("pages.mysteryBox.howTitle")}
          </p>
          <div className="mystery-steps">
            {(
              [
                t("pages.mysteryBox.step1"),
                t("pages.mysteryBox.step2"),
                t("pages.mysteryBox.step3"),
              ] as const
            ).map((label, i) => (
              <div key={label} className="mystery-step">
                <span className="mystery-step__num">{i + 1}</span>
                <span className="mystery-step__label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mystery-panel space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-cb-text-strong">
              {t("pages.mysteryBox.occasionLabel")}
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {availableOccasions.map((id) => {
                const meta = OCCASION_META[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setOccasion(id);
                      setResult(null);
                      setAdded(false);
                      setError(null);
                    }}
                    className={cn(
                      "mystery-occasion-btn",
                      occasion === id && "is-active",
                    )}
                  >
                    <span className="text-2xl">{meta.emoji}</span>
                    <span className="mt-1 block text-[11px] font-semibold text-cb-text-strong sm:text-xs">
                      {t(meta.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <label className="text-sm font-semibold text-cb-text-strong">
                {t("pages.mysteryBox.budgetLabel")}
              </label>
              <span className="text-xs text-cb-text-muted">
                {t("pages.mysteryBox.budgetHint")}
              </span>
            </div>
            {budgetTiers.length > 0 ? (
              <div
                className={cn(
                  "grid gap-2",
                  budgetTiers.length <= 2 ? "grid-cols-2" : "grid-cols-3",
                )}
              >
                {budgetTiers.map((tier) => (
                  <button
                    key={tier.ruleId}
                    type="button"
                    onClick={() => {
                      setBudget(tier.amount);
                      setResult(null);
                      setAdded(false);
                      setError(null);
                    }}
                    className={cn(
                      "mystery-budget-btn",
                      budget === tier.amount && "is-active",
                    )}
                  >
                    <span className="block text-sm font-bold">
                      {tier.amount} {BRAND.currency}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-medium text-cb-text-muted">
                      {t("pages.mysteryBox.tierItems", {
                        min: tier.minItems,
                        max: tier.maxItems,
                      })}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-cb-text-muted">
                {t("pages.mysteryBox.errRulesUnavailable")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-cb-text-strong">
              {t("pages.mysteryBox.preferencesLabel")}
            </label>
            <textarea
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={t("pages.mysteryBox.preferencesPlaceholder")}
              className="w-full resize-none rounded-2xl border border-cb-border bg-cb-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cb-terracotta/30"
            />
          </div>

          <button
            type="button"
            disabled={!canGenerate || loading}
            onClick={() => void generate()}
            className={buttonClassName(
              "primary",
              "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base",
            )}
          >
            {loading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" aria-hidden />
                {t("pages.mysteryBox.generating")}
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" aria-hidden />
                {t("pages.mysteryBox.generate")}
              </>
            )}
          </button>

          {error ? (
            <p className="text-center text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        {result ? (
          <div
            ref={resultRef}
            className="mystery-result mystery-panel space-y-5"
          >
            <div className="text-center">
              <p className="text-lg font-semibold text-cb-text-strong">
                {result.description}
              </p>
              <p className="mt-1 text-2xl font-bold text-cb-terracotta-dark">
                {result.totalPrice} {BRAND.currency}
              </p>
              <p className="text-xs text-cb-text-muted">
                {result.totalItems} {t("pages.mysteryBox.items")} · {result.boxSize}
              </p>
            </div>

            <ul className="space-y-2">
              {result.items.map((item) => (
                <li key={item.productId} className="mystery-result-item">
                  <Image
                    src={item.imageUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="mystery-result-item__img"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-cb-text-strong">{item.name}</p>
                    <p className="text-xs text-cb-text-muted">{item.reason}</p>
                  </div>
                  <span className="text-sm font-bold text-cb-text-strong">
                    ×{item.quantity}
                  </span>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void generate()}
                disabled={loading}
                className={buttonClassName(
                  "outline",
                  "flex items-center justify-center gap-2 rounded-2xl py-3",
                )}
              >
                <Shuffle className="h-4 w-4" aria-hidden />
                {t("pages.mysteryBox.shuffle")}
              </button>
              <button
                type="button"
                onClick={addToCart}
                disabled={added}
                className={buttonClassName(
                  "primary",
                  "flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold",
                )}
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden />
                    {t("pages.mysteryBox.addedToCart")}
                  </>
                ) : (
                  t("pages.mysteryBox.addToCart")
                )}
              </button>
            </div>

            <p className="text-center text-xs text-cb-text-muted">
              {t("pages.mysteryBox.or")}{" "}
              <Link
                href="/gift-box/build"
                className="font-semibold text-cb-terracotta-dark underline"
              >
                {t("pages.mysteryBox.buildOwn")}
              </Link>
            </p>
          </div>
        ) : null}

        <p className="text-center text-xs text-cb-text-muted">
          {t("pages.mysteryBox.trustNote")}
        </p>

        <section className="rounded-3xl border border-cb-border bg-cb-surface/80 p-6 text-center sm:text-start">
          <h2 className="font-serif text-xl font-semibold text-cb-text-strong">
            {t("pages.mysteryBox.seoTitle")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-cb-text">
            {t("pages.mysteryBox.seoBody")}
          </p>
        </section>
      </div>
    </div>
  );
}
