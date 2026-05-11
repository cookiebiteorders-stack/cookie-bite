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
import { LANG_COOKIE, writeClientPrefCookie } from "@/lib/preferences/client-cookies";

type TranslateVars = Record<string, string | number>;

type LanguageContextValue = {
  lang: Lang;
  setLanguage: (lang: Lang) => void;
  toggleLanguage: () => void;
  t: (key: string, vars?: TranslateVars) => string;
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

  const setLanguage = useCallback((nextLang: Lang) => {
    setLang(nextLang);
    localStorage.setItem(STORAGE_KEY, nextLang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(lang === "ar" ? "en" : "ar");
  }, [lang, setLanguage]);

  const t = useCallback(
    (key: string, vars?: TranslateVars) => {
      const active = translations[lang] as Record<string, unknown>;
      const english = translations.en as Record<string, unknown>;
      const value = getNestedValue(active, key) ?? getNestedValue(english, key);
      if (typeof value === "string") return interpolate(value, vars);
      return key;
    },
    [lang],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLanguage,
      toggleLanguage,
      t,
    }),
    [lang, setLanguage, toggleLanguage, t],
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
