"use client";

import { useMemo } from "react";
import { useLanguage } from "@/components/providers/language-provider";

/** Shorthand: `adminT("discounts.title")` → `t("adminDiscounts.title")`. */
export function useAdminT() {
  const { t, lang } = useLanguage();

  const adminT = useMemo(
    () => (key: string, vars?: Record<string, string | number>) => {
      const dot = key.indexOf(".");
      const section = dot === -1 ? key : key.slice(0, dot);
      const rest = dot === -1 ? "" : key.slice(dot + 1);
      const sectionAliases: Record<string, string> = {
        roles: "adminRolesPage",
      };
      const base =
        sectionAliases[section] ??
        `admin${section.charAt(0).toUpperCase()}${section.slice(1)}`;
      const fullKey = `${base}${rest ? `.${rest}` : ""}`;
      return t(fullKey, vars);
    },
    [t],
  );

  const apiErr = useMemo(
    () =>
      (err: { en?: string; ar?: string } | undefined, fallback: string) => {
        if (lang === "ar") return err?.ar ?? err?.en ?? fallback;
        return err?.en ?? fallback;
      },
    [lang],
  );

  return { adminT, t, lang, apiErr };
}
