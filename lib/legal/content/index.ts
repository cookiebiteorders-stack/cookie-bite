import type { LegalDocumentMeta } from "@/lib/legal/types";
import { privacyAr } from "@/lib/legal/content/privacy.ar";
import { privacyEn } from "@/lib/legal/content/privacy.en";
import { termsAr } from "@/lib/legal/content/terms.ar";
import { termsEn } from "@/lib/legal/content/terms.en";

export function getTermsDocument(lang: "en" | "ar"): LegalDocumentMeta {
  return lang === "ar" ? termsAr : termsEn;
}

export function getPrivacyDocument(lang: "en" | "ar"): LegalDocumentMeta {
  return lang === "ar" ? privacyAr : privacyEn;
}
