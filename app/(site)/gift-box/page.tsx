import type { Metadata } from "next";
import { GiftBoxClient } from "@/components/pages/gift-box-client";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { getGiftBoxPageFaq } from "@/lib/content/gift-box-seo";
import { translations } from "@/lib/i18n/translations";
import { listOccasionTemplates } from "@/lib/occasion-templates/list";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildLocalizedPageMetadata,
} from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";
import { listProductsForCollection } from "@/lib/storefront/collection-products";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/gift-box", lang);
}

export default async function GiftBoxPage() {
  const lang = await getLangFromCookies();
  const dict = translations[lang];
  const [giftProducts, occasionTemplates] = await Promise.all([
    listProductsForCollection("gifts", lang),
    listOccasionTemplates(),
  ]);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: (dict.tabs as { home: string }).home, path: "/" },
    { name: (dict.userMenu as { giftBox: string }).giftBox, path: "/gift-box" },
  ]);
  const faqJsonLd = buildFaqPageJsonLd(getGiftBoxPageFaq(lang));
  return (
    <>
      <JsonLdScript id="gift-box-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <JsonLdScript id="gift-box-faq-jsonld" json={faqJsonLd} />
      <GiftBoxClient
        giftProducts={giftProducts}
        occasionTemplates={occasionTemplates}
      />
    </>
  );
}
