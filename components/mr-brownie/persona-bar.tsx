"use client";

import { useLanguage } from "@/components/providers/language-provider";
import {
  PERSONA_CONFIG,
  type PersonaPreference,
} from "@/lib/mr-brownie/personas";
import { cn } from "@/lib/utils";

const PERSONA_ORDER: readonly PersonaPreference[] = ["auto", "mr_brownie", "mrs_cookie"];

type PersonaBarProps = {
  value: PersonaPreference;
  onChange: (pref: PersonaPreference) => void;
  compact?: boolean;
  className?: string;
};

function activePersonaClass(id: PersonaPreference, active: boolean): string {
  if (!active) return "cb-mr-brownie-persona-btn--idle";
  if (id === "mr_brownie") return "cb-mr-brownie-persona-btn--active-brownie";
  if (id === "mrs_cookie") return "cb-mr-brownie-persona-btn--active-cookie";
  return "cb-mr-brownie-persona-btn--active-auto";
}

export function PersonaBar({
  value,
  onChange,
  compact = false,
  className,
}: PersonaBarProps) {
  const { t, lang } = useLanguage();
  const label = t("mrBrownieChat.personas.label");

  return (
    <div
      className={cn(
        "cb-mr-brownie-persona-bar cb-mr-brownie-answer-styles shrink-0",
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
          🐻
        </span>
        <span className={compact ? "hidden sm:inline" : undefined}>{label}</span>
      </span>
      <div
        className="cb-mr-brownie-answer-styles__track flex min-w-0 flex-1 gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="radiogroup"
        aria-label={label}
      >
        {PERSONA_ORDER.map((id) => {
          const active = value === id;
          const hintKey =
            id === "auto"
              ? "mrBrownieChat.personas.autoHint"
              : id === "mr_brownie"
                ? "mrBrownieChat.personas.mrBrownieHint"
                : "mrBrownieChat.personas.mrsCookieHint";
          const optLabel =
            id === "auto"
              ? t("mrBrownieChat.personas.auto")
              : lang === "ar"
                ? PERSONA_CONFIG[id].displayNameAr
                : PERSONA_CONFIG[id].displayName;

          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={optLabel}
              title={t(hintKey)}
              onClick={() => onChange(id)}
              className={cn(
                "cb-mr-brownie-answer-style-btn shrink-0 rounded-full font-semibold leading-none transition",
                compact
                  ? "px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-[10px]"
                  : "px-2.5 py-1 text-[11px]",
                activePersonaClass(id, active),
              )}
            >
              {optLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
