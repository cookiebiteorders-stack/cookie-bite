"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { pickAdminLabel, type BilingualPair } from "@/lib/admin/admin-label";

/** Admin label — shows active language (Arabic or English). */
export function AdminBilingualLabel({
  en,
  ar,
  htmlFor,
  className = "",
}: {
  en: string;
  ar: string;
  htmlFor?: string;
  className?: string;
}) {
  const { lang } = useLanguage();
  const Tag = htmlFor ? "label" : "div";
  return (
    <Tag htmlFor={htmlFor} className={`block ${className}`.trim()}>
      <span className="text-xs font-bold text-cb-text-strong">{pickAdminLabel({ en, ar }, lang)}</span>
    </Tag>
  );
}

export function AdminBilingualSection({
  en,
  ar,
  className = "",
}: {
  en: string;
  ar: string;
  className?: string;
}) {
  const { lang } = useLanguage();
  return (
    <div className={`border-b border-cb-border pb-2 ${className}`.trim()}>
      <h2 className="text-sm font-bold text-cb-text-strong">{pickAdminLabel({ en, ar }, lang)}</h2>
    </div>
  );
}

export function useAdminBilingual() {
  const { lang } = useLanguage();
  return (pair: BilingualPair) => pickAdminLabel(pair, lang);
}
