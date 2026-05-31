import { translations, type Lang } from "@/lib/i18n/translations";

export type GiftBoxBuilderSeoCopy = {
  title: string;
  body: string;
  relatedLinksAria: string;
  linkGiftBoxes: string;
  linkCorporate: string;
  linkGiftingHelp: string;
  linkDelivery: string;
};

export function getGiftBoxBuilderSeoCopy(lang: Lang): GiftBoxBuilderSeoCopy {
  const pages = translations[lang].pages as { giftBoxBuilderSeo: GiftBoxBuilderSeoCopy };
  return pages.giftBoxBuilderSeo;
}
