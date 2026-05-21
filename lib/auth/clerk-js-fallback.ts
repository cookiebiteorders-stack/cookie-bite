/**
 * CDN fallback when Clerk Frontend API lives on a custom host (e.g. clerk.cookie-bite.com)
 * but DNS is not configured yet — avoids `failed_to_load_clerk_js` in local dev.
 *
 * Production still needs the Clerk CNAME (or pk_test keys locally). See docs/clerk-dns-subdomain-ar.md
 */
export const CLERK_JS_CDN_FALLBACK =
  "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6/dist/clerk.browser.js";

export function resolveClerkJsUrlForNextEnv(): string {
  const custom = process.env.NEXT_PUBLIC_CLERK_JS_URL?.trim();
  if (custom) return custom;
  if (process.env.NODE_ENV === "development") return CLERK_JS_CDN_FALLBACK;
  return "";
}
