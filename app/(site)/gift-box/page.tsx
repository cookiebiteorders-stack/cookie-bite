import type { Metadata } from "next";
import { GiftBoxClient } from "@/components/pages/gift-box-client";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { buildPageMetadata, buildBreadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Cookie Gift Boxes in New Cairo",
  description:
    "Explore premium Cookie Bite gift boxes for birthdays, corporate gifting, and celebrations in New Cairo.",
  path: "/gift-box",
  keywords: [
    "cookie gift box cairo",
    "birthday cookie gifts",
    "corporate gift box egypt",
    "premium dessert gifts",
  ],
});

export default function GiftBoxPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Gift Boxes", path: "/gift-box" },
  ]);
  return (
    <>
      <JsonLdScript id="gift-box-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <GiftBoxClient />
    </>
  );
}
