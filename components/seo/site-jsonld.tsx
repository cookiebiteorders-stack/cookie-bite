import Script from "next/script";
import {
  APP_URL,
  BRAND_NAME,
  brandSameAsLinks,
  buildLocalBusinessJsonLd,
} from "@/lib/seo";
import { BRAND } from "@/lib/brand";

export function SiteJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    url: APP_URL,
    logo: `${APP_URL}/images/web-logo.png`,
    sameAs: brandSameAsLinks(),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: `+${BRAND.whatsappE164}`,
      email: BRAND.ordersEmail,
      availableLanguage: ["English", "Arabic"],
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME,
    url: APP_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${APP_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const localBusiness = buildLocalBusinessJsonLd();

  return (
    <>
      <Script
        id="cookie-bite-org-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(organization)}
      </Script>
      <Script
        id="cookie-bite-website-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(website)}
      </Script>
      <Script
        id="cookie-bite-localbusiness-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {localBusiness}
      </Script>
    </>
  );
}
