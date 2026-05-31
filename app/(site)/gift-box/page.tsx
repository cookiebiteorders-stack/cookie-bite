import type { Metadata } from "next";
import { GiftBoxClient } from "@/components/pages/gift-box-client";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { getGiftBoxPageFaq } from "@/lib/content/gift-box-seo";
import { translations } from "@/lib/i18n/translations";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildLocalizedPageMetadata,
  getLangFromCookies,
} from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/gift-box", lang);
}

export default async function GiftBoxPage() {
  const lang = await getLangFromCookies();
  const dict = translations[lang];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: (dict.tabs as { home: string }).home, path: "/" },
    { name: (dict.userMenu as { giftBox: string }).giftBox, path: "/gift-box" },
  ]);
  const faqJsonLd = buildFaqPageJsonLd(getGiftBoxPageFaq(lang));
  return (
    <>
      <JsonLdScript id="gift-box-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <JsonLdScript id="gift-box-faq-jsonld" json={faqJsonLd} />
      <GiftBoxClient />
    </>
  );
}
