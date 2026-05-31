import { GiftBoxBuilder } from "@/components/gift-box-builder/gift-box-builder";
import { GiftBoxBuilderSeoIntro } from "@/components/gift-box-builder/gift-box-builder-seo-intro";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { IMAGES } from "@/lib/data";
import {
  getGiftBoxBuilderHowTo,
  getGiftBoxPageFaq,
} from "@/lib/content/gift-box-seo";
import { translations } from "@/lib/i18n/translations";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildHowToJsonLd,
  buildPageMetadata,
  getLangFromCookies,
  getPageSeoEntry,
} from "@/lib/seo";

export async function generateMetadata() {
  const lang = await getLangFromCookies();
  const entry = getPageSeoEntry("/gift-box/build", lang);
  return buildPageMetadata({
    title: entry.title,
    description: entry.description,
    path: "/gift-box/build",
    keywords: entry.keywords,
    lang,
    image: IMAGES.giftBox,
  });
}

export default async function GiftBoxBuildPage() {
  const lang = await getLangFromCookies();
  const dict = translations[lang];
  const howTo = getGiftBoxBuilderHowTo(lang);
  const faq = getGiftBoxPageFaq(lang);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: (dict.tabs as { home: string }).home, path: "/" },
    { name: (dict.userMenu as { giftBox: string }).giftBox, path: "/gift-box" },
    {
      name: lang === "ar" ? "صمّم صندوقك" : "Build your box",
      path: "/gift-box/build",
    },
  ]);

  const howToJsonLd = buildHowToJsonLd({
    name: howTo.name,
    description: howTo.description,
    path: "/gift-box/build",
    steps: howTo.steps,
  });

  const faqJsonLd = buildFaqPageJsonLd(faq);

  return (
    <>
      <JsonLdScript id="gift-box-build-breadcrumb" json={breadcrumbJsonLd} />
      <JsonLdScript id="gift-box-build-howto" json={howToJsonLd} />
      <JsonLdScript id="gift-box-build-faq" json={faqJsonLd} />
      <GiftBoxBuilderSeoIntro lang={lang} />
      <GiftBoxBuilder />
    </>
  );
}
