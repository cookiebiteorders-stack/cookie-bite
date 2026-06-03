import { APP_URL } from "@/lib/seo/constants";

export function giftRevealPath(token: string): string {
  return `/gift-reveal/${encodeURIComponent(token)}`;
}

export function giftRevealUrl(token: string): string {
  return `${APP_URL.replace(/\/$/, "")}${giftRevealPath(token)}`;
}

export function giftPreviewPath(token: string): string {
  return `/gift-preview/${encodeURIComponent(token)}`;
}

export function giftPreviewUrl(token: string): string {
  return `${APP_URL.replace(/\/$/, "")}${giftPreviewPath(token)}`;
}
