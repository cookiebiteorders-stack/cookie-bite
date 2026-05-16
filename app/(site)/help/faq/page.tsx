import type { Metadata } from "next";
import { FaqPageBody } from "@/components/pages/faq-page-body";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { buildPageMetadata, buildBreadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "FAQ: Orders, Delivery, and Gifting",
  description:
    "Get quick answers about Cookie Bite delivery zones, freshness, gift notes, and order tracking in New Cairo.",
  path: "/help/faq",
  keywords: [
    "cookie bite faq",
    "cookie delivery faq cairo",
    "gift box questions",
    "order tracking cookie bite",
  ],
});

export default function FaqPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Help center", path: "/help" },
    { name: "FAQ", path: "/help/faq" },
  ]);
  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <JsonLdScript id="faq-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <FaqPageBody />
    </div>
  );
}
