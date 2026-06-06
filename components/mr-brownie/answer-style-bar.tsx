"use client";

import { useLanguage } from "@/components/providers/language-provider";
import {
  ANSWER_STYLE_CONFIG,
  ANSWER_STYLE_ORDER,
  type AnswerStyle,
  type AnswerStylePreference,
} from "@/lib/mr-brownie/answer-styles";
import { cn } from "@/lib/utils";

type AnswerStyleBarProps = {
  value: AnswerStylePreference;
  onChange: (pref: AnswerStylePreference) => void;
  compact?: boolean;
  className?: string;
};

export function AnswerStyleBar({
  value,
  onChange,
  compact = false,
  className,
}: AnswerStyleBarProps) {
  const { t } = useLanguage();

  const options: Array<{ id: AnswerStylePreference; label: string }> = [
    { id: "auto", label: t("mrBrownieChat.answerStyles.auto") },
    ...ANSWER_STYLE_ORDER.map((id) => ({
      id,
      label: `${ANSWER_STYLE_CONFIG[id].emoji} ${t(ANSWER_STYLE_CONFIG[id].labelKey)}`,
    })),
  ];

  return (
    <div
      className={cn(
        "cb-mr-brownie-answer-styles shrink-0 border-b border-white/10 bg-black/10",
        compact ? "px-2.5 py-1.5" : "px-4 py-2 sm:px-5",
        className,
      )}
    >
      <p
        className={cn(
          "mb-1.5 font-medium text-white/70",
          compact ? "text-[10px]" : "text-[11px]",
        )}
      >
        {t("mrBrownieChat.answerStyles.label")}
      </p>
      <div
        className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="radiogroup"
        aria-label={t("mrBrownieChat.answerStyles.label")}
      >
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={
                opt.id === "auto"
                  ? t("mrBrownieChat.answerStyles.autoHint")
                  : t(ANSWER_STYLE_CONFIG[opt.id as AnswerStyle].hintKey)
              }
              onClick={() => onChange(opt.id)}
              className={cn(
                "cb-mr-brownie-answer-style-btn shrink-0 rounded-full border px-2.5 py-1 font-semibold leading-none transition",
                compact ? "text-[10px]" : "text-[11px]",
                active
                  ? "border-[var(--mr-gold)] bg-white/15 text-[var(--mr-cream)] shadow-sm"
                  : "border-white/15 bg-white/5 text-white/75 hover:border-white/25 hover:bg-white/10",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
