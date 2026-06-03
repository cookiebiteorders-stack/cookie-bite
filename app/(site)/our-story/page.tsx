import type { Metadata } from "next";
import { OurStoryClient } from "@/components/pages/our-story-client";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { translations } from "@/lib/i18n/translations";
import { buildBreadcrumbJsonLd, buildLocalizedPageMetadata } from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/our-story", lang);
}

export default async function OurStoryPage() {
  const lang = await getLangFromCookies();
  const dict = translations[lang];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: (dict.tabs as { home: string }).home, path: "/" },
    { name: (dict.nav as { ourStory: string }).ourStory, path: "/our-story" },
  ]);
  return (
    <>
      <JsonLdScript id="our-story-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <OurStoryClient />
    </>
  );
}
