"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AuthTrustRow } from "@/components/auth/auth-trust-row";
import { PasswordRulesCallout } from "@/components/auth/password-rules-callout";
import { useLanguage } from "@/components/providers/language-provider";

type Props = {
  children: ReactNode;
  className?: string;
  showTrustRow?: boolean;
};

/** إطار بصري حول نموذج Clerk — حلقة لونية خفيفة ومزايا الحساب */
export function ClerkAuthShell({
  children,
  className,
  showTrustRow = true,
}: Props) {
  const { lang } = useLanguage();

  return (
    <div
      className={cn("clerk-auth-shell relative w-full min-w-0", className)}
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-cb-brand-300/35 via-cb-peach-deep/40 to-cb-mint/20 opacity-90 blur-[0.5px] dark:from-cb-brand-600/25 dark:via-cb-peach-deep/20 dark:to-cb-mint/15"
        aria-hidden
      />
      <div className="relative z-10 w-full min-w-0 rounded-[1.25rem]">{children}</div>
      <PasswordRulesCallout variant="auth" className="relative z-10 mt-4" />
      {showTrustRow ? <AuthTrustRow className="relative z-10 mt-4" /> : null}
    </div>
  );
}
