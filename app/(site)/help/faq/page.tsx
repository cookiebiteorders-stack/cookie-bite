import { FaqPageBody } from "@/components/pages/faq-page-body";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildPageMetadata } from "@/lib/seo";
import { getEnglishFaqItems } from "@/lib/seo/faq-server";

export const metadata = buildPageMetadata({
  title: "FAQ: Orders, Delivery, and Gifting",
  description:
    "Get quick answers about Cookie Bite delivery zones, freshness, gift notes, payments, allergens, and order tracking in New Cairo.",
  path: "/help/faq",
  keywords: [
    "cookie bite faq",
    "cookie delivery faq cairo",
    "gift box questions",
    "order tracking cookie bite",
    "cookie allergens egypt",
  ],
});

export default function FaqPage() {
  const faqItems = getEnglishFaqItems();
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
