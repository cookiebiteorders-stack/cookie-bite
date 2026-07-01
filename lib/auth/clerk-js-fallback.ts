/**
 * CDN fallback when Clerk Frontend API lives on a custom host (e.g. clerk.cookie-bite.com)
 * but DNS is not configured yet — avoids `failed_to_load_clerk_js` / `failed_to_load_clerk_ui`.
 *
 * Production still needs the Clerk CNAME (or pk_test keys locally). See docs/clerk-dns-subdomain-ar.md
 */
/** يطابق @clerk/nextjs@7 — انظر versionSelector في @clerk/shared */
export const CLERK_JS_VERSION_FALLBACK = "6.12.1";
/** يطابق clerkUIScriptUrl الافتراضي في @clerk/shared */
export const CLERK_UI_VERSION_FALLBACK = "1.13.1";

export const CLERK_JS_CDN_FALLBACK = `https://cdn.jsdelivr.net/npm/@clerk/clerk-js@${CLERK_JS_VERSION_FALLBACK}/dist/clerk.browser.js`;

export const CLERK_UI_CDN_FALLBACK = `https://cdn.jsdelivr.net/npm/@clerk/ui@${CLERK_UI_VERSION_FALLBACK}/dist/ui.browser.js`;

/** قيم @6 / @latest من .env تكسر mount مع clerk-ui 1.13.1 */
const UNSAFE_CLERK_SCRIPT_ALIASES = new Set(["@6", "@latest", "@7"]);

function resolveClerkScriptUrl(
  envValue: string | undefined,
  fallback: string,
): string {
  const custom = envValue?.trim();
  if (!custom || UNSAFE_CLERK_SCRIPT_ALIASES.has(custom)) return fallback;
  return custom;
}

/**
 * زوج CDN مُثبَّت (@clerk/nextjs@7 يتوقع clerk-js 6.12.1 + ui 1.13.1).
 * يُستخدم افتراضياً في التطوير والإنتاج حتى لا تفشل الصفحات عند غياب DNS لـ clerk.*.
 */
export function resolveClerkJsScriptUrl(): string {
  return resolveClerkScriptUrl(
    process.env.NEXT_PUBLIC_CLERK_JS_URL,
    CLERK_JS_CDN_FALLBACK,
  );
}

export function resolveClerkUIScriptUrl(): string {
  return resolveClerkScriptUrl(
    process.env.NEXT_PUBLIC_CLERK_UI_URL,
    CLERK_UI_CDN_FALLBACK,
  );
}

/** لـ next.config `env` */
export function resolveClerkJsUrlForNextEnv(): string {
  return resolveClerkJsScriptUrl();
}

export function resolveClerkUiUrlForNextEnv(): string {
  return resolveClerkUIScriptUrl();
}
