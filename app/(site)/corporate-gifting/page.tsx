import { SeoLandingPage } from "@/components/pages/seo-landing-page";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { CORPORATE_GIFTING_FAQ } from "@/lib/content/local-pages";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Corporate Cookie Gifting in Egypt",
  description:
    "Corporate and bulk cookie gift orders from Cookie Bite — branded packaging, event favors, and team gifts in New Cairo and beyond.",
  path: "/corporate-gifting",
  keywords: [
    "corporate cookie gifts egypt",
    "bulk cookie orders cairo",
    "branded cookie boxes",
    "office gifting desserts",
  ],
});

export default function CorporateGiftingPage() {
  const faqJsonLd = buildFaqPageJsonLd([...CORPORATE_GIFTING_FAQ]);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Corporate gifting", path: "/corporate-gifting" },
  ]);

  return (
    <>
      <JsonLdScript id="corporate-gifting-faq" json={faqJsonLd} />
      <JsonLdScript id="corporate-gifting-breadcrumb" json={breadcrumbJsonLd} />
      <SeoLandingPage
        eyebrow="Corporate"
        title="Corporate & bulk cookie gifting"
        subtitle="Impress clients and teams with premium cookie boxes, optional branding, and reliable New Cairo fulfillment."
        sections={[
          {
            heading: "Perfect for",
            body: "Client thank-yous, employee celebrations, launch events, school functions, and seasonal campaigns. Mix classic and stuffed flavors in one branded experience.",
          },
          {
            heading: "Branding options",
            body: "Custom sticker seals, sleeve bands, and note cards available for qualifying volumes. Share your brand guidelines when requesting a quote.",
          },
          {
            heading: "How to start",
            body: "Use our contact form with your event date, quantity, and delivery zone. Our team replies with flavor recommendations and lead times.",
          },
        ]}
        faqs={[...CORPORATE_GIFTING_FAQ]}
        ctaHref="/contact"
        ctaLabel="Request a quote"
      />
    </>
  );
}
