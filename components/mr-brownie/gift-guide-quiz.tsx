"use client";

import { useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  GiftGuideAnswers,
  GiftGuideBudget,
  GiftGuideDietary,
  GiftGuideOccasion,
} from "@/lib/mr-brownie/gift-guide";

type Step = "budget" | "occasion" | "dietary";

type Props = {
  onComplete: (answers: GiftGuideAnswers) => void;
  onCancel: () => void;
};

export function GiftGuideQuiz({ onComplete, onCancel }: Props) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("budget");
  const [budget, setBudget] = useState<GiftGuideBudget | null>(null);
  const [occasion, setOccasion] = useState<GiftGuideOccasion | null>(null);

  const budgetOptions: Array<{ id: GiftGuideBudget; label: string }> = [
    { id: "under_300", label: t("mrBrownieChat.giftGuide.budgetUnder300") },
    { id: "mid", label: t("mrBrownieChat.giftGuide.budgetMid") },
    { id: "premium", label: t("mrBrownieChat.giftGuide.budgetPremium") },
  ];

  const occasionOptions: Array<{ id: GiftGuideOccasion; label: string }> = [
    { id: "birthday", label: t("mrBrownieChat.giftGuide.occasionBirthday") },
    { id: "wedding", label: t("mrBrownieChat.giftGuide.occasionWedding") },
    { id: "thank_you", label: t("mrBrownieChat.giftGuide.occasionThankYou") },
    { id: "corporate", label: t("mrBrownieChat.giftGuide.occasionCorporate") },
    { id: "eid", label: t("mrBrownieChat.giftGuide.occasionEid") },
    { id: "general", label: t("mrBrownieChat.giftGuide.occasionGeneral") },
  ];

  const dietaryOptions: Array<{ id: GiftGuideDietary; label: string }> = [
    { id: "none", label: t("mrBrownieChat.giftGuide.dietaryNone") },
    { id: "nut_free", label: t("mrBrownieChat.giftGuide.dietaryNutFree") },
  ];

  const stepTitle =
    step === "budget"
      ? t("mrBrownieChat.giftGuide.stepBudget")
      : step === "occasion"
        ? t("mrBrownieChat.giftGuide.stepOccasion")
        : t("mrBrownieChat.giftGuide.stepDietary");

  const stepIndex = step === "budget" ? 1 : step === "occasion" ? 2 : 3;

  return (
    <div className="rounded-2xl border border-cb-brand-200/70 bg-gradient-to-br from-cb-peach/30 to-cb-surface p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-cb-brand-600">
            {t("mrBrownieChat.giftGuide.title")} · {stepIndex}/3
          </p>
          <p className="mt-0.5 text-sm font-semibold text-cb-text-strong">{stepTitle}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-cb-text-muted underline-offset-2 hover:underline"
        >
          {t("mrBrownieChat.giftGuide.cancel")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {step === "budget"
          ? budgetOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setBudget(opt.id);
                  setStep("occasion");
                }}
                className={cn(
                  buttonClassName("outline", "rounded-full px-3 py-2 text-xs font-bold"),
                )}
              >
                {opt.label}
              </button>
            ))
          : null}
        {step === "occasion"
          ? occasionOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setOccasion(opt.id);
                  setStep("dietary");
                }}
                className={cn(
                  buttonClassName("outline", "rounded-full px-3 py-2 text-xs font-bold"),
                )}
              >
                {opt.label}
              </button>
            ))
          : null}
        {step === "dietary"
          ? dietaryOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={!budget || !occasion}
                onClick={() => {
                  if (!budget || !occasion) return;
                  onComplete({
                    budget,
                    occasion,
                    dietary: opt.id,
                  });
                }}
                className={cn(
                  buttonClassName("primary", "rounded-full px-3 py-2 text-xs font-bold"),
                )}
              >
                {opt.label}
              </button>
            ))
          : null}
      </div>

      {step !== "budget" ? (
        <button
          type="button"
          onClick={() => setStep(step === "dietary" ? "occasion" : "budget")}
          className="mt-3 text-xs font-semibold text-cb-brand-600 hover:underline"
        >
          {t("mrBrownieChat.giftGuide.back")}
        </button>
      ) : null}
    </div>
  );
}
