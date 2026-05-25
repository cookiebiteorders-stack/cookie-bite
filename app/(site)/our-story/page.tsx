import type { Metadata } from "next";
import { OurStoryClient } from "@/components/pages/our-story-client";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { buildBreadcrumbJsonLd, buildLocalizedPageMetadata, getLangFromCookies } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/our-story", lang);
}

export default function OurStoryPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Our Story", path: "/our-story" },
  ]);
  return (
    <>
      <JsonLdScript id="our-story-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <OurStoryClient />
    </>
  );
}
