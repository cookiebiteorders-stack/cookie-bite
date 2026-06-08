"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { type Lang, translations } from "@/lib/i18n/translations";
import { formatProductPriceEgp } from "@/lib/products/pricing";
import { LANG_COOKIE, writeClientPrefCookie } from "@/lib/preferences/client-cookies";

type TranslateVars = Record<string, string | number>;

export type SetLanguageOptions = {
  /** false = تحديث العميل فقط (معاينة إدارة / morph). الافتراضي: إعادة تحميل كاملة */
  reload?: boolean;
};

type LanguageContextValue = {
  lang: Lang;
  setLanguage: (lang: Lang, options?: SetLanguageOptions) => void;
  toggleLanguage: () => void;
  t: (key: string, vars?: TranslateVars) => string;
  formatPrice: (amount: number) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "lang";

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function interpolate(text: string, vars?: TranslateVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = vars[token];
    return value === undefined ? `{${token}}` : String(value);
  });
}

function applyLanguageToDocument(lang: Lang) {
  const root = document.documentElement;
  root.setAttribute("lang", lang);
  root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  root.setAttribute("data-lang", lang);
}

type LanguageProviderProps = {
  children: React.ReactNode;
  /** لازم يطابق `cookies().get(lang)` من الخادم لتفادي اختلاف الترطيب مع `localStorage` */
  initialLang: Lang;
};

export function LanguageProvider({ children, initialLang }: LanguageProviderProps) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return initialLang;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "en" || stored === "ar" ? stored : initialLang;
  });

  useLayoutEffect(() => {
    applyLanguageToDocument(lang);
    writeClientPrefCookie(LANG_COOKIE, lang);
  }, [lang]);

  const persistLanguage = useCallback((nextLang: Lang) => {
    localStorage.setItem(STORAGE_KEY, nextLang);
    writeClientPrefCookie(LANG_COOKIE, nextLang);
    applyLanguageToDocument(nextLang);
  }, []);

  const setLanguage = useCallback(
    (nextLang: Lang, options?: SetLanguageOptions) => {
      if (nextLang === lang) return;

      const reload = options?.reload !== false;
      if (reload) {
        persistLanguage(nextLang);
        window.location.reload();
        return;
      }

      setLang(nextLang);
      persistLanguage(nextLang);
    },
    [lang, persistLanguage],
  );

  const toggleLanguage = useCallback(() => {
    setLanguage(lang === "ar" ? "en" : "ar");
  }, [lang, setLanguage]);

  const t = useCallback(
    (key: string, vars?: TranslateVars) => {
      const active = translations[lang] as Record<string, unknown>;
      const english = translations.en as Record<string, unknown>;
      const value =
        getNestedValue(active, key) ??
        getNestedValue(english, key) ??
        (key.startsWith("home.")
          ? getNestedValue(active, key.slice(5)) ?? getNestedValue(english, key.slice(5))
          : undefined);
      if (typeof value === "string") return interpolate(value, vars);
      return key;
    },
    [lang],
  );

  const formatPrice = useCallback(
    (amount: number) => formatProductPriceEgp(amount),
    [],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLanguage,
      toggleLanguage,
      t,
      formatPrice,
    }),
    [lang, setLanguage, toggleLanguage, t, formatPrice],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }
  return ctx;
}
