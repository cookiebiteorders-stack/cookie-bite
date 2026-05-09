/** مفاتيح كوكيز تتطابق مع localStorage للثيم واللغة — يقرأها الخادم في `layout` */
export const THEME_COOKIE = "cookie-bite-theme";
export const LANG_COOKIE = "lang";
export const CLIENT_PREF_MAX_AGE = 60 * 60 * 24 * 365;

export function writeClientPrefCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${CLIENT_PREF_MAX_AGE};SameSite=Lax`;
}
