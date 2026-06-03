"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type Props = {
  titleKey: string;
  subtitleKey?: string;
  className?: string;
};

/** عنوان صفحة إدارة موحّد — يقرأ من adminPages.* أو adminHero.* */
export function AdminPageIntro({ titleKey, subtitleKey, className }: Props) {
  const { t } = useLanguage();

  return (
    <section
      className={cn(
        "admin-panel-surface rounded-2xl p-5 shadow-[var(--shadow-card)] cb-shadow-editorial",
        className,
      )}
    >
      <h1 className="font-serif text-3xl font-bold text-cb-text-strong">{t(titleKey)}</h1>
      {subtitleKey ? (
        <p className="mt-2 max-w-3xl text-sm text-cb-text-muted">{t(subtitleKey)}</p>
      ) : null}
    </section>
  );
}
