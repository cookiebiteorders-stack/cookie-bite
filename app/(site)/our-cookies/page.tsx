import type { Metadata } from "next";
import { OurCookiesClient } from "@/components/pages/our-cookies-client";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { buildPageMetadata, buildBreadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Our Cookie Flavors",
  description:
    "Discover Cookie Bite flavor collections with handcrafted textures, premium ingredients, and seasonal specials in New Cairo.",
  path: "/our-cookies",
  keywords: [
    "cookie flavors cairo",
    "best cookie menu egypt",
    "artisan cookies new cairo",
    "seasonal cookies",
  ],
});

export default function OurCookiesPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Our Cookies", path: "/our-cookies" },
  ]);
  return (
    <div>
      <JsonLdScript id="our-cookies-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <OurCookiesClient />
    </div>
  );
}
