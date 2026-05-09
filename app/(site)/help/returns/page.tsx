import type { Metadata } from "next";
import { ReturnsPageBody } from "@/components/pages/returns-page-body";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { buildPageMetadata, buildBreadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Returns and Refunds Policy",
  description:
    "Read Cookie Bite returns and refunds policy for perishable goods, wrong items, and approved payment adjustments.",
  path: "/help/returns",
  keywords: [
    "cookie returns policy",
    "refund policy egypt",
    "damaged order support",
    "cookie bite returns",
  ],
});

export default function ReturnsPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Help", path: "/help/faq" },
    { name: "Returns", path: "/help/returns" },
  ]);
  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <JsonLdScript id="returns-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <ReturnsPageBody />
    </div>
  );
}
