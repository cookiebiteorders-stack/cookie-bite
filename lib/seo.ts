import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com";
const BRAND = "Cookie Bite";

type BuildMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
};

export function buildPageMetadata({
  title,
  description,
  path,
  keywords = [],
  image = "/images/web-logo.png",
  noIndex = false,
}: BuildMetadataInput): Metadata {
  const canonical = path.startsWith("/") ? path : `/${path}`;
  const url = `${APP_URL}${canonical}`;
  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
      languages: {
        en: url,
        ar: url,
        "x-default": url,
      },
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: "website",
      url,
      title: `${title} | ${BRAND}`,
      description,
      siteName: BRAND,
      images: [{ url: `${APP_URL}${image}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@cookiebite8",
      creator: "@cookiebite8",
      title: `${title} | ${BRAND}`,
      description,
      images: [`${APP_URL}${image}`],
    },
    other: {
      language: "English",
      "revisit-after": "7 days",
      author: BRAND,
    },
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): string {
  const itemListElement = items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `${APP_URL}${item.path}`,
  }));

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  });
}

