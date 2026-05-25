import { translations, type Lang } from "@/lib/i18n/translations";

export type CorporateFaqItem = { q: string; a: string };

export function getCorporateGiftingFaq(lang: Lang): CorporateFaqItem[] {
  const block = translations[lang].pages as {
    corporateGifting: { faq: { items: Record<string, CorporateFaqItem> } };
  };
  return Object.entries(block.corporateGifting.faq.items)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, item]) => item);
}
