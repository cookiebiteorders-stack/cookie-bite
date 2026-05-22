import { SeoLandingPage } from "@/components/pages/seo-landing-page";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { BRAND } from "@/lib/brand";
import { NEW_CAIRO_DELIVERY_FAQ } from "@/lib/content/local-pages";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Cookie Delivery in New Cairo",
  description:
    "Order fresh Cookie Bite cookies and gift boxes with delivery across New Cairo. Free delivery over 500 EGP, small-batch baking, and WhatsApp support.",
  path: "/delivery/new-cairo",
  keywords: [
    "cookie delivery new cairo",
    "cookie bite delivery",
    "fresh cookies delivered cairo",
    "dessert delivery fifth settlement",
  ],
});

export default function DeliveryNewCairoPage() {
  const faqJsonLd = buildFaqPageJsonLd([...NEW_CAIRO_DELIVERY_FAQ]);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Delivery in New Cairo", path: "/delivery/new-cairo" },
  ]);

  return (
    <>
      <JsonLdScript id="delivery-new-cairo-faq" json={faqJsonLd} />
      <JsonLdScript id="delivery-new-cairo-breadcrumb" json={breadcrumbJsonLd} />
      <SeoLandingPage
        eyebrow="Delivery"
        title="Cookie delivery in New Cairo"
        subtitle={`Fresh Cookie Bite boxes baked in small batches and delivered from ${BRAND.location}.`}
        sections={[
          {
            heading: "Zones we serve",
            body: "We deliver across Fifth Settlement, Mivida, Mountain View, Hyde Park, Katameya, Madinaty, Rehab, and many more compounds. Confirm your address on WhatsApp before large gift orders.",
          },
          {
            heading: "Free delivery threshold",
            body: `Enjoy free delivery on qualifying orders over ${BRAND.freeDeliveryThresholdEgp} EGP before discounts, when your zone is eligible. Fees and payment methods appear at checkout.`,
          },
          {
            heading: "Packaging & freshness",
            body: "Cookies are packed to travel well in our branded boxes. For the best texture, enjoy within a few days and store in an airtight container.",
          },
        ]}
        faqs={[...NEW_CAIRO_DELIVERY_FAQ]}
        ctaHref="/shop"
        ctaLabel="Order cookies"
      />
    </>
  );
}
