/**
 * CDN fallback when Clerk Frontend API lives on a custom host (e.g. clerk.cookie-bite.com)
 * but DNS is not configured yet — avoids `failed_to_load_clerk_js` in local dev.
 *
 * Production still needs the Clerk CNAME (or pk_test keys locally). See docs/clerk-dns-subdomain-ar.md
 */
export const CLERK_JS_CDN_FALLBACK =
  "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6/dist/clerk.browser.js";

/** يُمرَّر إلى ClerkProvider — يجب أن يكون معرّفاً صراحةً لأن المفتاح live قد يتجاهل env */
export function resolveClerkJsScriptUrl(): string | undefined {
  const custom = process.env.NEXT_PUBLIC_CLERK_JS_URL?.trim();
  if (custom) return custom;
  if (process.env.NODE_ENV === "development") return CLERK_JS_CDN_FALLBACK;
  return undefined;
}

/** لـ next.config `env` — نفس المنطق كسلسلة فارغة عند عدم الحاجة */
export function resolveClerkJsUrlForNextEnv(): string {
  return resolveClerkJsScriptUrl() ?? "";
}
