/**
 * CDN fallback when Clerk Frontend API lives on a custom host (e.g. clerk.cookie-bite.com)
 * but DNS is not configured yet — avoids `failed_to_load_clerk_js` / `failed_to_load_clerk_ui` in local dev.
 *
 * Production still needs the Clerk CNAME (or pk_test keys locally). See docs/clerk-dns-subdomain-ar.md
 */
/** يطابق @clerk/nextjs@7 — انظر versionSelector في @clerk/shared */
export const CLERK_JS_VERSION_FALLBACK = "6.12.1";
/** يطابق clerkUIScriptUrl الافتراضي في @clerk/shared */
export const CLERK_UI_VERSION_FALLBACK = "1.13.1";

export const CLERK_JS_CDN_FALLBACK = `https://cdn.jsdelivr.net/npm/@clerk/clerk-js@${CLERK_JS_VERSION_FALLBACK}/dist/clerk.browser.js`;

export const CLERK_UI_CDN_FALLBACK = `https://cdn.jsdelivr.net/npm/@clerk/ui@${CLERK_UI_VERSION_FALLBACK}/dist/ui.browser.js`;

function useDevCdnFallback(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * في التطوير نُجبر زوج CDN مُثبَّت (@clerk/nextjs@7 يتوقع clerk-js 6.12.1 + ui 1.13.1).
 * تجاهل NEXT_PUBLIC_CLERK_JS_URL=@6 من .env — يحمّل أحدث 6.x ويكسر mount لواجهة UI.
 */
export function resolveClerkJsScriptUrl(): string | undefined {
  if (useDevCdnFallback()) return CLERK_JS_CDN_FALLBACK;
  const custom = process.env.NEXT_PUBLIC_CLERK_JS_URL?.trim();
  if (custom) return custom;
  return undefined;
}

export function resolveClerkUIScriptUrl(): string | undefined {
  if (useDevCdnFallback()) return CLERK_UI_CDN_FALLBACK;
  const custom = process.env.NEXT_PUBLIC_CLERK_UI_URL?.trim();
  if (custom) return custom;
  return undefined;
}

/** لـ next.config `env` — نفس المنطق كسلسلة فارغة عند عدم الحاجة */
export function resolveClerkJsUrlForNextEnv(): string {
  return resolveClerkJsScriptUrl() ?? "";
}

export function resolveClerkUiUrlForNextEnv(): string {
  return resolveClerkUIScriptUrl() ?? "";
}
