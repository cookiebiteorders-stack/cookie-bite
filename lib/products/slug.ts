/**
 * Product URL slugs — Latin-safe, with fallback when the name is Arabic-only.
 */

export function slugifyLatin(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function randomSlugSuffix(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  }
  return Date.now().toString(36).slice(-8);
}

/**
 * Preferred slug for a product: explicit slug → Latin from name → unique `product-xxxx`.
 */
export function deriveProductSlug(name: string, explicitSlug?: string): string {
  const fromExplicit = explicitSlug?.trim() ? slugifyLatin(explicitSlug) : "";
  if (fromExplicit.length >= 2) return fromExplicit.slice(0, 180);

  const fromName = slugifyLatin(name);
  if (fromName.length >= 2) return fromName.slice(0, 180);

  return `product-${randomSlugSuffix()}`;
}

/** Append numeric suffix when slug collides (e.g. `cookie-box` → `cookie-box-2`). */
export function appendSlugSuffix(base: string, attempt: number): string {
  if (attempt <= 1) return base.slice(0, 180);
  const suffix = `-${attempt}`;
  return `${base.slice(0, Math.max(2, 180 - suffix.length))}${suffix}`;
}
