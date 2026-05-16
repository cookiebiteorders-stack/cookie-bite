import type { Metadata } from "next";
import { HelpCenterBody } from "@/components/pages/help-center-body";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { buildPageMetadata, buildBreadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Help Center: Orders, Delivery, Returns & Support",
  description:
    "Cookie Bite Help Center — search articles or browse topics about orders, delivery, returns, payments, and gifting. Reach our team on WhatsApp, phone, or email.",
  path: "/help",
  keywords: [
    "cookie bite help center",
    "cookie bite support",
    "cookie delivery help cairo",
    "cookie bite returns",
    "cookie bite contact",
  ],
});

export default function HelpCenterPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Help center", path: "/help" },
  ]);
  return (
    <>
      <JsonLdScript id="help-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <HelpCenterBody />
    </>
  );
}
