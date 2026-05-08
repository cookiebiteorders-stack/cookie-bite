import type { Metadata } from "next";
import { SearchPageClient } from "@/src/pages/SearchPage";
import { buildPageMetadata, buildBreadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Search Cookies and Gift Boxes",
  description:
    "Search Cookie Bite products, flavors, and gifting options to quickly find the best cookies in New Cairo.",
  path: "/search",
  keywords: [
    "search cookies cairo",
    "find cookie flavors",
    "cookie bite search",
    "gift box search",
  ],
});

export default function SearchPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: buildBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Search", path: "/search" },
          ]),
        }}
      />
      <SearchPageClient />
    </>
  );
}
