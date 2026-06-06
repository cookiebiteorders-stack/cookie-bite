"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type PasswordRulesCalloutProps = {
  variant?: "auth" | "settings";
  className?: string;
};

export function PasswordRulesCallout({
  variant = "auth",
  className,
}: PasswordRulesCalloutProps) {
  const { t, lang } = useLanguage();
  const rules = [
    t("passwordRules.ruleLength"),
    t("passwordRules.ruleTyping"),
    t("passwordRules.ruleMix"),
    t("passwordRules.ruleOAuth"),
  ];

  return (
    <aside
      className={cn(
        "rounded-xl border border-cb-border bg-cb-brand-50/50 px-3.5 py-3 text-sm dark:bg-cb-surface-2/80",
        className,
      )}
      dir={lang === "ar" ? "rtl" : "ltr"}
      aria-label={t("passwordRules.title")}
    >
      <p className="font-semibold text-cb-text-strong">{t("passwordRules.title")}</p>
      <p className="mt-1 text-xs leading-relaxed text-cb-text-muted">
        {variant === "auth" ? t("passwordRules.authIntro") : t("passwordRules.settingsIntro")}
      </p>
      <ul className="mt-2.5 space-y-1.5 text-xs text-cb-text">
        {rules.map((rule) => (
          <li key={rule} className="flex gap-2">
            <span aria-hidden className="mt-0.5 text-cb-brand-600 dark:text-cb-brand-300">
              •
            </span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[11px] leading-relaxed text-cb-text-muted">
        {t("passwordRules.typingHint")}
      </p>
    </aside>
  );
}
