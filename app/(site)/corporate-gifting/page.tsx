import type { Metadata } from "next";
import { CorporateGiftingClient } from "@/components/pages/corporate-gifting-client";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { getCorporateGiftingFaq } from "@/lib/content/corporate-gifting-faq";
import { translations } from "@/lib/i18n/translations";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildLocalizedPageMetadata,
} from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/corporate-gifting", lang);
}

export default async function CorporateGiftingPage() {
  const lang = await getLangFromCookies();
  const faqJsonLd = buildFaqPageJsonLd(getCorporateGiftingFaq(lang));
  const dict = translations[lang];
  const homeLabel = (dict.tabs as { home: string }).home;
  const pageLabel = (dict.pages as { corporateGifting: { breadcrumb: string } })
    .corporateGifting.breadcrumb;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: homeLabel, path: "/" },
    { name: pageLabel, path: "/corporate-gifting" },
  ]);

  return (
    <>
      <JsonLdScript id="corporate-gifting-faq" json={faqJsonLd} />
      <JsonLdScript id="corporate-gifting-breadcrumb" json={breadcrumbJsonLd} />
      <CorporateGiftingClient />
    </>
  );
}
