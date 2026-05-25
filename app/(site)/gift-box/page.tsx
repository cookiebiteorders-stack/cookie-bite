import type { Metadata } from "next";
import { GiftBoxClient } from "@/components/pages/gift-box-client";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { buildBreadcrumbJsonLd, buildLocalizedPageMetadata, getLangFromCookies } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/gift-box", lang);
}

export default function GiftBoxPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Gift Boxes", path: "/gift-box" },
  ]);
  return (
    <>
      <JsonLdScript id="gift-box-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <GiftBoxClient />
    </>
  );
}
