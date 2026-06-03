import { translations, type Lang } from "@/lib/i18n/translations";

type TranslateVars = Record<string, string | number>;

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

/** Server-side `t()` — mirrors LanguageProvider fallback (active → en → key). */
export function getServerT(lang: Lang) {
  const active = translations[lang] as Record<string, unknown>;
  const english = translations.en as Record<string, unknown>;

  return (key: string, vars?: TranslateVars): string => {
    const value = getNestedValue(active, key) ?? getNestedValue(english, key);
    if (typeof value === "string") return interpolate(value, vars);
    return key;
  };
}
