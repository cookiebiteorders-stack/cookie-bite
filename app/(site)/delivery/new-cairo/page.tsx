import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/pages/seo-landing-page";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { getNewCairoDeliveryContent } from "@/lib/content/delivery-seo";
import { translations } from "@/lib/i18n/translations";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildLocalizedPageMetadata,
} from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/delivery/new-cairo", lang);
}

export default async function DeliveryNewCairoPage() {
  const lang = await getLangFromCookies();
  const dict = translations[lang];
  const content = getNewCairoDeliveryContent(lang);

  const faqJsonLd = buildFaqPageJsonLd(content.faqs);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: (dict.tabs as { home: string }).home, path: "/" },
    {
      name: lang === "ar" ? "التوصيل في القاهرة الجديدة" : "Delivery in New Cairo",
      path: "/delivery/new-cairo",
    },
  ]);

  return (
    <>
      <JsonLdScript id="delivery-new-cairo-faq" json={faqJsonLd} />
      <JsonLdScript id="delivery-new-cairo-breadcrumb" json={breadcrumbJsonLd} />
      <SeoLandingPage
        eyebrow={content.eyebrow}
        title={content.title}
        subtitle={content.subtitle}
        sections={content.sections}
        faqs={content.faqs}
        faqHeading={content.faqHeading}
        relatedLinks={content.relatedLinks}
        relatedLinksAria={content.relatedLinksAria}
        ctaHref={content.ctaHref}
        ctaLabel={content.ctaLabel}
      />
    </>
  );
}
