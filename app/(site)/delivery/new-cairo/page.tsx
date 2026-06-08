import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/pages/seo-landing-page";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { getNewCairoDeliveryContent } from "@/lib/content/delivery-seo";
import { getPublicShippingZones } from "@/lib/shipping/public-zones-server";
import { getFreeShippingThresholdEgp } from "@/lib/store/commerce-settings-server";
import { translations } from "@/lib/i18n/translations";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildLocalizedPageMetadata,
} from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  const threshold = await getFreeShippingThresholdEgp();
  return buildLocalizedPageMetadata("/delivery/new-cairo", lang, { threshold });
}

export default async function DeliveryNewCairoPage() {
  const lang = await getLangFromCookies();
  const [dict, zones, freeShippingThresholdEgp] = await Promise.all([
    Promise.resolve(translations[lang]),
    getPublicShippingZones(),
    getFreeShippingThresholdEgp(),
  ]);
  const content = getNewCairoDeliveryContent(lang, zones, freeShippingThresholdEgp);

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
