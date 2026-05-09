import type { Metadata } from "next";
import { OurStoryClient } from "@/components/pages/our-story-client";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { buildPageMetadata, buildBreadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Our Story",
  description:
    "Read the Cookie Bite story and discover how our New Cairo kitchen crafts cookies, gift boxes, and memorable moments.",
  path: "/our-story",
  keywords: [
    "cookie bite story",
    "new cairo bakery story",
    "handcrafted cookies egypt",
    "about cookie bite",
  ],
});

export default function OurStoryPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Our Story", path: "/our-story" },
  ]);
  return (
    <>
      <JsonLdScript id="our-story-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <OurStoryClient />
    </>
  );
}
