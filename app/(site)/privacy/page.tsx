import type { Metadata } from "next";
import { SectionHeading } from "@/components/sections/section-heading";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { buildPageMetadata, buildBreadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "Learn how Cookie Bite collects, stores, and protects account and order data with secure privacy practices.",
  path: "/privacy",
  keywords: [
    "cookie bite privacy policy",
    "data protection bakery website",
    "customer data privacy egypt",
  ],
});

export default function PrivacyPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Privacy Policy", path: "/privacy" },
  ]);
  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <JsonLdScript id="privacy-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <SectionHeading
          align="left"
          className="text-left"
          eyebrow="Legal"
          title="Privacy policy"
          subtitle="بياناتك وطلباتك — ممارسات جمع البيانات والدفع (نسخة أولية؛ راجع مع مستشارك القانوني عند التوسع)."
        />
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-cb-text">
          <p>
            Cookie Bite respects your privacy. This page will describe what data we collect
            (orders, account details, marketing preferences), how we use Clerk and Supabase to
            secure authentication and profiles, and your rights under applicable law.
          </p>
          <p>
            For payments, Paymob processes card data — we do not store full card numbers on
            our servers. For emails, we use trusted providers (e.g. Resend) with clear opt-out
            for marketing messages.
          </p>
          <p className="rounded-2xl bg-cb-peach/60 p-4 text-cb-text-strong">
            <strong>Privacy / الخصوصية:</strong> We collect data needed to fulfill orders and
            accounts (name, phone, address, email when provided). Authentication may use Clerk;
            profiles and orders may be stored in Supabase with access controls. We do not sell
            your personal data. You may request access or correction by contacting us via the
            site. Card payments are handled by Paymob; we do not store full card numbers.
            Marketing emails are opt-out where applicable.
          </p>
        </div>
      </div>
    </div>
  );
}
