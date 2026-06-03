"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RefreshCw, Shuffle, Sparkles } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import type { MysteryBoxGenerateResult, MysteryOccasion } from "@/lib/mystery-box/types";

const OCCASIONS: {
  id: MysteryOccasion;
  labelEn: string;
  labelAr: string;
  emoji: string;
}[] = [
  { id: "birthday", labelEn: "Birthday", labelAr: "عيد ميلاد", emoji: "🎂" },
  { id: "ramadan", labelEn: "Ramadan", labelAr: "رمضان", emoji: "🌙" },
  { id: "thanks", labelEn: "Thank you", labelAr: "شكراً", emoji: "🙏" },
  { id: "corporate", labelEn: "Corporate", labelAr: "شركات", emoji: "🏢" },
  { id: "wedding", labelEn: "Wedding", labelAr: "زواج", emoji: "💍" },
];

const BUDGETS_EGP = [400, 600, 800, 1200, 1600, 2000] as const;

export function MysteryBoxClient() {
  const { lang } = useLanguage();
  const { addGiftBoxItem, openDrawer } = useCart();
  const ar = lang === "ar";

  const [occasion, setOccasion] = useState<MysteryOccasion | "">("");
  const [budget, setBudget] = useState<number>(0);
  const [preferences, setPreferences] = useState("");
  const [result, setResult] = useState<MysteryBoxGenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = Boolean(occasion && budget > 0);

  const budgetsForOccasion = useMemo(() => {
    if (!occasion) return [...BUDGETS_EGP];
    const bands: Record<MysteryOccasion, number[]> = {
      birthday: [400, 600, 800],
      ramadan: [400, 600, 800],
      thanks: [400, 600],
      corporate: [1200, 1600, 2000],
      wedding: [800, 1200, 1600],
    };
    return bands[occasion] ?? [...BUDGETS_EGP];
  }, [occasion]);

  async function generate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setResult(null);
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
        setError(
          (ar ? data?.error?.ar : data?.error?.en) ??
            (ar ? "تعذر إنشاء الصندوق." : "Could not generate box."),
        );
        return;
      }
      setResult(data.box);
    } catch {
      setError(ar ? "خطأ في الشبكة." : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  function addToCart() {
    if (!result) return;
    addGiftBoxItem({
      id: crypto.randomUUID(),
      name: ar ? "صندوق المفاجأة" : "Mystery Gift Box",
      image: "/brand/gift-box/box-closed-ref.png",
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
    openDrawer();
  }

  return (
    <div className="min-h-[70vh] bg-cb-cream px-4 py-12">
      <div className="mx-auto max-w-lg space-y-8">
        <div className="text-center">
          <div className="text-5xl" aria-hidden>
            🎁
          </div>
          <h1 className="mt-4 font-serif text-3xl font-semibold text-cb-text-strong">
            {ar ? "صندوق المفاجأة" : "Mystery Box"}
          </h1>
          <p className="mt-2 text-sm text-cb-text-muted">
            {ar
              ? "اختر المناسبة والميزانية — نختار لك التشكيلة!"
              : "Pick occasion and budget — we curate the box for you."}
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-cb-text-strong">
            {ar ? "المناسبة" : "Occasion"}
          </label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {OCCASIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setOccasion(o.id);
                  setBudget(0);
                  setResult(null);
                }}
                className={`rounded-2xl border-2 py-3 text-center transition ${
                  occasion === o.id
                    ? "border-cb-terracotta bg-cb-peach/60"
                    : "border-cb-border bg-cb-surface hover:border-cb-terracotta/40"
                }`}
              >
                <span className="text-2xl">{o.emoji}</span>
                <span className="mt-1 block text-[11px] font-semibold text-cb-text-strong">
                  {ar ? o.labelAr : o.labelEn}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-cb-text-strong">
            {ar ? "الميزانية" : "Budget"}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {budgetsForOccasion.map((b) => (
              <button
                key={b}
                type="button"
                disabled={!occasion}
                onClick={() => {
                  setBudget(b);
                  setResult(null);
                }}
                className={`rounded-2xl border-2 py-3 text-sm font-semibold transition disabled:opacity-40 ${
                  budget === b
                    ? "border-cb-terracotta bg-cb-peach/60 text-cb-terracotta-dark"
                    : "border-cb-border bg-cb-surface text-cb-text-strong hover:border-cb-terracotta/40"
                }`}
              >
                {b} {BRAND.currency}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-cb-text-strong">
            {ar ? "تفضيلات (اختياري)" : "Preferences (optional)"}
          </label>
          <textarea
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={
              ar
                ? "مثال: يحب الشوكولاتة، بدون مكسرات…"
                : "e.g. loves chocolate, no nuts…"
            }
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
              {ar ? "جاري الاختيار…" : "Curating…"}
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" aria-hidden />
              {ar ? "اصنع صندوقي" : "Create my box"}
            </>
          )}
        </button>

        {error ? (
          <p className="text-center text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="animate-fade-in space-y-4 rounded-3xl border border-cb-border bg-cb-surface p-6 shadow-sm">
            <div className="text-center">
              <p className="font-semibold text-cb-text-strong">{result.description}</p>
              <p className="mt-1 text-xl font-bold text-cb-terracotta-dark">
                {result.totalPrice} {BRAND.currency}
              </p>
              <p className="text-xs text-cb-text-muted">
                {result.totalItems} {ar ? "قطعة" : "items"} · {result.boxSize}
              </p>
            </div>

            <ul className="space-y-3">
              {result.items.map((item) => (
                <li key={item.productId} className="flex gap-3">
                  <Image
                    src={item.imageUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-2xl object-cover"
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
                {ar ? "خيار آخر" : "Shuffle"}
              </button>
              <button
                type="button"
                onClick={addToCart}
                className={buttonClassName(
                  "primary",
                  "rounded-2xl py-3 font-semibold",
                )}
              >
                {ar ? "أضف للسلة" : "Add to cart"}
              </button>
            </div>

            <p className="text-center text-xs text-cb-text-muted">
              {ar ? "أو " : "Or "}
              <Link href="/gift-box/build" className="text-cb-terracotta-dark underline">
                {ar ? "خصّص الصندوق بنفسك" : "build your own box"}
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
