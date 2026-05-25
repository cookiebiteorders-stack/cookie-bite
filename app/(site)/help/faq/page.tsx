import type { Metadata } from "next";
import { FaqPageBody } from "@/components/pages/faq-page-body";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildLocalizedPageMetadata,
  getLangFromCookies,
} from "@/lib/seo";
import { getFaqItems } from "@/lib/seo/faq-server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/help/faq", lang);
}

export default async function FaqPage() {
  const lang = await getLangFromCookies();
  const faqItems = getFaqItems(lang);
  const faqJsonLd = buildFaqPageJsonLd(faqItems);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Help center", path: "/help" },
    { name: "FAQ", path: "/help/faq" },
  ]);

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <JsonLdScript id="faq-page-jsonld" json={faqJsonLd} />
      <JsonLdScript id="faq-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <FaqPageBody />
    </div>
  );
}
