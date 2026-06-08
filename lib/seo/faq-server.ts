import "server-only";
import { BRAND, brandLocation } from "@/lib/brand";
import { translations, type Lang } from "@/lib/i18n/translations";
import { FAQ_ITEM_KEYS, type FaqItemKey } from "@/lib/seo/faq-keys";
import { getFreeShippingThresholdEgp } from "@/lib/store/commerce-settings-server";

type FaqItem = { q: string; a: string };

function interpolateFaq(template: string, lang: Lang, threshold: number): string {
  return template
    .replace(/\{location\}/g, brandLocation(lang))
    .replace(/\{threshold\}/g, String(threshold))
    .replace(/\{phone\}/g, BRAND.phoneDisplay);
}

function getFaqItemsForLang(lang: Lang, threshold: number): FaqItem[] {
  const pages = translations[lang].pages as Record<string, unknown>;
  const items = pages?.faq as Record<string, unknown> | undefined;
  const faqItems = items?.items as Record<string, { q?: string; a?: string }> | undefined;
  if (!faqItems) return [];

  return FAQ_ITEM_KEYS.map((key: FaqItemKey) => {
    const row = faqItems[key];
    return {
      q: row?.q ?? "",
      a: interpolateFaq(row?.a ?? "", lang, threshold),
    };
  }).filter((x) => x.q && x.a);
}

/** English FAQ pairs for SSR JSON-LD and metadata */
export async function getEnglishFaqItems(): Promise<FaqItem[]> {
  const threshold = await getFreeShippingThresholdEgp();
  return getFaqItemsForLang("en", threshold);
}

export async function getFaqItems(lang: Lang): Promise<FaqItem[]> {
  const threshold = await getFreeShippingThresholdEgp();
  return getFaqItemsForLang(lang, threshold);
}
