import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AuthTrustRow } from "@/components/auth/auth-trust-row";

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
  return (
    <div className={cn("clerk-auth-shell relative w-full min-w-0", className)}>
      <div
        className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-cb-brand-logo/40 via-cb-peach-deep/30 to-cb-terracotta-soft/25 opacity-80 blur-[0.5px] dark:from-amber-500/25 dark:via-stone-700/40 dark:to-amber-900/20"
        aria-hidden
      />
      <div className="relative z-10 w-full min-w-0 rounded-[1.25rem]">
        {children}
      </div>
      {showTrustRow ? <AuthTrustRow className="relative z-10 mt-4" /> : null}
    </div>
  );
}
