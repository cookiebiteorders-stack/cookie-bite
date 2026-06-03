import type { Lang } from "@/lib/i18n/translations";
import type { UserRole } from "@/lib/admin/rbac";

export type BilingualPair = { en: string; ar: string };

export function pickAdminLabel(pair: BilingualPair, lang: Lang): string {
  return lang === "ar" ? pair.ar : pair.en;
}

export function formatAdminMoney(amount: number, lang: Lang): string {
  if (!Number.isFinite(amount)) return "—";
  const formatted = Math.round(amount).toLocaleString(lang === "ar" ? "ar-EG" : "en-US");
  return lang === "ar" ? `${formatted} جنيه` : `EGP ${formatted}`;
}

export function adminRoleKey(role: UserRole): string {
  return `adminRoles.${role}`;
}
