"use client";

import { MrsCookieAvatar } from "@/components/admin/copilot/mrs-cookie-avatar";
import { useLanguage } from "@/components/providers/language-provider";

export function AdminCopilotPageHeader() {
  const { t } = useLanguage();

  return (
    <header className="flex shrink-0 items-start gap-3 sm:gap-4">
      <MrsCookieAvatar size={56} className="shrink-0 sm:hidden" />
      <MrsCookieAvatar size={72} className="hidden shrink-0 sm:block" />
      <div className="min-w-0 flex-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cb-peach/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cb-brand-logo">
          AI · Beta
        </span>
        <h1 className="mt-2 text-xl font-bold text-cb-text-strong sm:text-2xl">
          {t("adminPages.copilot.title")}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-cb-text-soft">
          {t("adminPages.copilot.subtitle")}
        </p>
      </div>
    </header>
  );
}
