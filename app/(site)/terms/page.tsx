import type { Metadata } from "next";
import { SectionHeading } from "@/components/sections/section-heading";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { buildPageMetadata, buildBreadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms and Conditions",
  description:
    "Review Cookie Bite terms and conditions for website use, order acceptance, pricing, and service policies.",
  path: "/terms",
  keywords: [
    "cookie bite terms",
    "website terms and conditions egypt",
    "online order terms",
  ],
});

export default function TermsPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Terms", path: "/terms" },
  ]);
  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <JsonLdScript id="terms-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <SectionHeading
          align="left"
          className="text-left"
          eyebrow="Legal"
          title="Terms & conditions"
          subtitle="استخدام الموقع والطلبات والأسعار — إطار أولي (استشر مستشارك القانوني للوثيقة الكاملة)."
        />
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-cb-text">
          <p>
            By using cookie-bite.com (and related domains) you agree to these terms. Product
            descriptions, prices in EGP, and delivery zones may change; we’ll honor confirmed
            orders at the price shown at checkout.
          </p>
          <p>
            Gift messages and customization must not contain offensive or unlawful content.
            We may refuse orders that violate our policies or capacity limits.
          </p>
          <p className="rounded-2xl bg-cb-peach/60 p-4 text-cb-text-strong">
            <strong>Terms / الشروط:</strong> By ordering, you accept prices in EGP at checkout
            and our delivery/fulfillment policies. We may cancel or adjust orders that are
            unavailable, fraudulent, or beyond service area. Custom or gift messages must not be
            unlawful or offensive. Limitation of liability applies to the extent permitted by
            law in Egypt. Disputes: contact us first; governing law Egypt unless otherwise agreed
            in writing.
          </p>
        </div>
      </div>
    </div>
  );
}
