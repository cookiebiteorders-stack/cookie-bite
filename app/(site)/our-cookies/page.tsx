import type { Metadata } from "next";
import { OurCookiesClient } from "@/components/pages/our-cookies-client";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { getOurCookiesPageFaq } from "@/lib/content/our-cookies-seo";
import { translations } from "@/lib/i18n/translations";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildLocalizedPageMetadata,
} from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/our-cookies", lang);
}

export default async function OurCookiesPage() {
  const lang = await getLangFromCookies();
  const dict = translations[lang];
  const faqJsonLd = buildFaqPageJsonLd(getOurCookiesPageFaq(lang));
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: (dict.tabs as { home: string }).home, path: "/" },
    { name: (dict.nav as { ourCookies: string }).ourCookies, path: "/our-cookies" },
  ]);

  return (
    <>
      <JsonLdScript id="our-cookies-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <JsonLdScript id="our-cookies-faq-jsonld" json={faqJsonLd} />
      <OurCookiesClient />
    </>
  );
}
