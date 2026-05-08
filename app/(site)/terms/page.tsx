import type { Metadata } from "next";
import { SectionHeading } from "@/components/sections/section-heading";
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <SectionHeading
          align="left"
          className="text-left"
          eyebrow="Legal"
          title="Terms & conditions"
          subtitle="Summary placeholder — replace with counsel-approved text before launch."
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
            <strong>Note:</strong> Replace this stub with full terms covering liability,
            governing law (Egypt), dispute resolution, and marketplace rules.
          </p>
        </div>
      </div>
    </div>
  );
}
