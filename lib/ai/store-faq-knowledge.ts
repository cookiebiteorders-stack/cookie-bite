import { BRAND, brandLocation } from "@/lib/brand";
import { FAQ_ITEM_KEYS } from "@/lib/seo/faq-keys";
import { translations, type Lang } from "@/lib/i18n/translations";
import { ENV_FREE_SHIPPING_THRESHOLD_EGP } from "@/lib/store/commerce-settings-shared";
import { siteConfig } from "@/lib/site-config";

export type StoreFaqEntry = {
  lang: Lang;
  question: string;
  answer: string;
};

function interpolateTemplate(text: string, lang: Lang, threshold: number): string {
  return text
    .replace(/\{location\}/g, brandLocation(lang))
    .replace(/\{threshold\}/g, String(threshold))
    .replace(/\{phone\}/g, BRAND.phoneDisplay);
}

function extractFaqItems(lang: Lang, threshold: number): StoreFaqEntry[] {
  const pages = translations[lang].pages as Record<string, unknown> | undefined;
  const faq = pages?.faq as { items?: Record<string, { q?: string; a?: string }> } | undefined;
  const items = faq?.items;
  if (!items) return [];

  const out: StoreFaqEntry[] = [];
  for (const key of FAQ_ITEM_KEYS) {
    const row = items[key];
    if (!row?.q || !row?.a) continue;
    out.push({
      lang,
      question: interpolateTemplate(String(row.q), lang, threshold),
      answer: interpolateTemplate(String(row.a), lang, threshold).slice(0, 420),
    });
  }
  return out;
}

/** RAG-lite: FAQ و سياسات ثابتة من نفس محتوى الموقع (بدون Vector DB). */
export function buildStoreKnowledgeBase(
  freeShippingThresholdEgp: number = ENV_FREE_SHIPPING_THRESHOLD_EGP,
): {
  faq: StoreFaqEntry[];
  policies: string[];
  source: "site_translations";
} {
  const faq = [
    ...extractFaqItems("en", freeShippingThresholdEgp),
    ...extractFaqItems("ar", freeShippingThresholdEgp),
  ];
  const policies = [
    `Free delivery threshold: ${freeShippingThresholdEgp} ${BRAND.currency} (see FAQ).`,
    `Standard delivery fee reference: ${siteConfig.standardDeliveryFeeEgp} ${BRAND.currency} when below threshold.`,
    "Returns: perishable goods — report damage/wrong items within 24 hours with photos (/help/returns).",
    "Payments: online card via Paymob at checkout; COD may show for eligible zones only.",
    "Allergens: gluten, dairy, eggs common; see /help/allergens and product dietary flags in CONTEXT.products.",
  ];

  return { faq, policies, source: "site_translations" };
}
