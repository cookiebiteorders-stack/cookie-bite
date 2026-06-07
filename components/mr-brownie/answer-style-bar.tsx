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
  const label = t("mrBrownieChat.answerStyles.label");

  const options: Array<{ id: AnswerStylePreference; label: string; hint: string }> = [
    {
      id: "auto",
      label: t("mrBrownieChat.answerStyles.auto"),
      hint: t("mrBrownieChat.answerStyles.autoHint"),
    },
    ...ANSWER_STYLE_ORDER.map((id) => ({
      id,
      label: compact
        ? ANSWER_STYLE_CONFIG[id].emoji
        : `${ANSWER_STYLE_CONFIG[id].emoji} ${t(ANSWER_STYLE_CONFIG[id].labelKey)}`,
      hint: t(ANSWER_STYLE_CONFIG[id].hintKey),
    })),
  ];

  return (
    <div
      className={cn(
        "cb-mr-brownie-answer-styles shrink-0",
        compact && "cb-mr-brownie-answer-styles--compact",
        className,
      )}
    >
      <span
        className={cn(
          "cb-mr-brownie-answer-styles__label font-semibold",
          compact ? "text-[9px] sm:text-[10px]" : "text-[11px]",
        )}
      >
        <span className="sm:hidden" aria-hidden>
          🎨
        </span>
        <span className={compact ? "hidden sm:inline" : undefined}>{label}</span>
      </span>
      <div
        className="cb-mr-brownie-answer-styles__track flex min-w-0 flex-1 gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="radiogroup"
        aria-label={label}
      >
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={
                opt.id === "auto"
                  ? t("mrBrownieChat.answerStyles.auto")
                  : t(ANSWER_STYLE_CONFIG[opt.id as AnswerStyle].labelKey)
              }
              title={opt.hint}
              onClick={() => onChange(opt.id)}
              className={cn(
                "cb-mr-brownie-answer-style-btn shrink-0 rounded-full font-semibold leading-none transition",
                compact
                  ? "px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-[10px]"
                  : "px-2.5 py-1 text-[11px]",
                active && "cb-mr-brownie-answer-style-btn--active",
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
