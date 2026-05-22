import "server-only";
import { BRAND } from "@/lib/brand";
import { translations } from "@/lib/i18n/translations";
import { FAQ_ITEM_KEYS, type FaqItemKey } from "@/lib/seo/faq-keys";

type FaqItem = { q: string; a: string };

function interpolateFaq(template: string): string {
  return template
    .replace(/\{location\}/g, BRAND.location)
    .replace(/\{threshold\}/g, String(BRAND.freeDeliveryThresholdEgp))
    .replace(/\{phone\}/g, BRAND.phoneDisplay);
}

/** English FAQ pairs for SSR JSON-LD and metadata */
export function getEnglishFaqItems(): FaqItem[] {
  const pages = translations.en.pages as Record<string, unknown>;
  const items = pages?.faq as Record<string, unknown> | undefined;
  const faqItems = items?.items as Record<string, { q?: string; a?: string }> | undefined;
  if (!faqItems) return [];

  return FAQ_ITEM_KEYS.map((key: FaqItemKey) => {
    const row = faqItems[key];
    return {
      q: row?.q ?? "",
      a: interpolateFaq(row?.a ?? ""),
    };
  }).filter((x) => x.q && x.a);
}
