/** بيانات العلامة الرسمية — Master Documentation §1.1 */

import type { Lang } from "@/lib/i18n/translations";

export const BRAND = {
  /** لون الشعار والأيقونة (Playful cookie-orange) */
  logoHex: "#e8782a",
  phoneDisplay: "01140165995",
  whatsappE164: "201140165995",
  location: "Fifth Settlement, New Cairo, Egypt",
  locationAr: "التجمع الخامس، القاهرة الجديدة، مصر",
  currency: "EGP",
  social: {
    facebook: "https://www.facebook.com/share/1DNLZAfGfF/",
    tiktok: "https://www.tiktok.com/@cookie_bite01",
    instagram: "https://www.instagram.com/cookiebite8",
  },
  email: "cookie-bite@cookie-bite.com",
  ordersEmail: "cookie-bite@cookie-bite.com",
} as const;

export function brandLocation(lang: Lang): string {
  return lang === "ar" ? BRAND.locationAr : BRAND.location;
}
