import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchLoadingFallback } from "@/components/i18n/suspense-loading";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { SearchPageClient } from "@/src/components/search/SearchPageClient";
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
      <JsonLdScript
        id="search-breadcrumb-jsonld"
        json={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Search", path: "/search" },
        ])}
      />
      <Suspense fallback={<SearchLoadingFallback />}>
        <SearchPageClient />
      </Suspense>
    </>
  );
}
