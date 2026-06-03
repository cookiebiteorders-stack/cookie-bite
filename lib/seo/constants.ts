/** Client-safe SEO constants (no `next/headers`). */

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com";

export const BRAND_NAME = "Cookie Bite";

export type CollectionSeoKey = "classic" | "seasonal" | "stuffed" | "gifts";
