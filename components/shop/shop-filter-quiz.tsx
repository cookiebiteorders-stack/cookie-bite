"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackGa4Event } from "@/lib/analytics/ga4";
import type {
  ShopFilterQuizAnswers,
  ShopQuizBudget,
  ShopQuizPurpose,
  ShopQuizTaste,
} from "@/lib/storefront/shop-filter-quiz";

type Step = "purpose" | "budget" | "taste";

type Props = {
  open: boolean;
  onClose: () => void;
  onComplete: (answers: ShopFilterQuizAnswers) => void;
};

export function ShopFilterQuiz({ open, onClose, onComplete }: Props) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("purpose");
  const [purpose, setPurpose] = useState<ShopQuizPurpose | null>(null);
  const [budget, setBudget] = useState<ShopQuizBudget | null>(null);

  if (!open) return null;

  const stepIndex = step === "purpose" ? 1 : step === "budget" ? 2 : 3;
  const stepTitle =
    step === "purpose"
      ? t("pages.shop.filterQuiz.stepPurpose")
      : step === "budget"
        ? t("pages.shop.filterQuiz.stepBudget")
        : t("pages.shop.filterQuiz.stepTaste");

  const purposeOptions: Array<{ id: ShopQuizPurpose; label: string }> = [
    { id: "self", label: t("pages.shop.filterQuiz.purposeSelf") },
    { id: "gift", label: t("pages.shop.filterQuiz.purposeGift") },
    { id: "kids", label: t("pages.shop.filterQuiz.purposeKids") },
    { id: "corporate", label: t("pages.shop.filterQuiz.purposeCorporate") },
  ];

  const budgetOptions: Array<{ id: ShopQuizBudget; label: string }> = [
    { id: "under_300", label: t("pages.shop.filterQuiz.budgetUnder300") },
    { id: "mid", label: t("pages.shop.filterQuiz.budgetMid") },
    { id: "premium", label: t("pages.shop.filterQuiz.budgetPremium") },
  ];

  const tasteOptions: Array<{ id: ShopQuizTaste; label: string }> = [
    { id: "classic", label: t("pages.shop.filterQuiz.tasteClassic") },
    { id: "chocolate", label: t("pages.shop.filterQuiz.tasteChocolate") },
    { id: "gift_box", label: t("pages.shop.filterQuiz.tasteGiftBox") },
    { id: "bestsellers", label: t("pages.shop.filterQuiz.tasteBestsellers") },
  ];

  const reset = () => {
    setStep("purpose");
    setPurpose(null);
    setBudget(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-filter-quiz-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-cb-scrim-strong/55"
        aria-label={t("pages.shop.closeFilters")}
        onClick={handleClose}
      />
      <div className="relative w-full max-w-lg rounded-3xl border border-cb-border bg-cb-surface p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cb-peach text-cb-brand-700">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-cb-brand-600">
              {t("pages.shop.filterQuiz.eyebrow")} · {stepIndex}/3
            </p>
            <h2
              id="shop-filter-quiz-title"
              className="mt-0.5 font-serif text-xl font-semibold text-cb-text-strong"
            >
              {stepTitle}
            </h2>
            <p className="mt-1 text-sm text-cb-text-muted">{t("pages.shop.filterQuiz.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-xs font-semibold text-cb-text-muted underline-offset-2 hover:underline"
          >
            {t("pages.shop.filterQuiz.cancel")}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {step === "purpose"
            ? purposeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPurpose(opt.id);
                    setStep("budget");
                  }}
                  className={cn(
                    buttonClassName("outline", "rounded-full px-3 py-2 text-xs font-bold"),
                  )}
                >
                  {opt.label}
                </button>
              ))
            : null}
          {step === "budget"
            ? budgetOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setBudget(opt.id);
                    setStep("taste");
                  }}
                  className={cn(
                    buttonClassName("outline", "rounded-full px-3 py-2 text-xs font-bold"),
                  )}
                >
                  {opt.label}
                </button>
              ))
            : null}
          {step === "taste"
            ? tasteOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!purpose || !budget}
                  onClick={() => {
                    if (!purpose || !budget) return;
                    const answers: ShopFilterQuizAnswers = {
                      purpose,
                      budget,
                      taste: opt.id,
                    };
                    trackGa4Event("shop_filter_quiz_complete", {
                      purpose,
                      budget,
                      taste: opt.id,
                    });
                    onComplete(answers);
                    reset();
                  }}
                  className={cn(
                    buttonClassName("outline", "rounded-full px-3 py-2 text-xs font-bold"),
                  )}
                >
                  {opt.label}
                </button>
              ))
            : null}
        </div>

        {step !== "purpose" ? (
          <button
            type="button"
            className="mt-4 text-xs font-semibold text-cb-terracotta-dark underline-offset-2 hover:underline"
            onClick={() => {
              if (step === "taste") setStep("budget");
              else setStep("purpose");
            }}
          >
            {t("pages.shop.filterQuiz.back")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Compact trigger for shop toolbar. */
export function ShopFilterQuizTrigger({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={() => {
        trackGa4Event("shop_filter_quiz_start");
        onClick();
      }}
      className={cn(
        buttonClassName(
          "outline",
          "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide",
        ),
      )}
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      {t("pages.shop.filterQuiz.trigger")}
    </button>
  );
}
