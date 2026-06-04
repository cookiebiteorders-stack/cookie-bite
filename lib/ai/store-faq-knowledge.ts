import { BRAND } from "@/lib/brand";
import { FAQ_ITEM_KEYS } from "@/lib/seo/faq-keys";
import { translations, type Lang } from "@/lib/i18n/translations";
import { siteConfig } from "@/lib/site-config";

export type StoreFaqEntry = {
  lang: Lang;
  question: string;
  answer: string;
};

function interpolateTemplate(text: string): string {
  return text
    .replace(/\{location\}/g, BRAND.location)
    .replace(/\{threshold\}/g, String(siteConfig.freeDeliveryThresholdEgp))
    .replace(/\{phone\}/g, BRAND.phoneDisplay);
}

function extractFaqItems(lang: Lang): StoreFaqEntry[] {
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
      question: interpolateTemplate(String(row.q)),
      answer: interpolateTemplate(String(row.a)).slice(0, 420),
    });
  }
  return out;
}

/** RAG-lite: FAQ و سياسات ثابتة من نفس محتوى الموقع (بدون Vector DB). */
export function buildStoreKnowledgeBase(): {
  faq: StoreFaqEntry[];
  policies: string[];
  source: "site_translations";
} {
  const faq = [...extractFaqItems("en"), ...extractFaqItems("ar")];
  const policies = [
    `Free delivery threshold: ${siteConfig.freeDeliveryThresholdEgp} ${BRAND.currency} (see FAQ).`,
    `Standard delivery fee reference: ${siteConfig.standardDeliveryFeeEgp} ${BRAND.currency} when below threshold.`,
    "Returns: perishable goods — report damage/wrong items within 24 hours with photos (/help/returns).",
    "Payments: online card via Paymob at checkout; COD may show for eligible zones only.",
    "Allergens: gluten, dairy, eggs common; see /help/allergens and product dietary flags in CONTEXT.products.",
  ];

  return { faq, policies, source: "site_translations" };
}
