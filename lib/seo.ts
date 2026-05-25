import type { Metadata } from "next";
import { cookies } from "next/headers";
import { BRAND } from "@/lib/brand";
import type { Product } from "@/lib/data";
import type { Lang } from "@/lib/i18n/translations";
import { LANG_COOKIE } from "@/lib/preferences/client-cookies";
import {
  PAGE_METADATA,
  type LocalizedPageKey,
  type PageSeoEntry,
} from "@/lib/seo/page-metadata";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com";
export const BRAND_NAME = "Cookie Bite";
const TWITTER_SITE = "@cookiebite8";

const OG_LOCALE_EN = "en_US";
const OG_LOCALE_AR = "ar_EG";

type BuildMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
  ogType?: "website" | "article";
  lang?: Lang;
};

export async function getLangFromCookies(): Promise<Lang> {
  const store = await cookies();
  return store.get(LANG_COOKIE)?.value === "en" ? "en" : "ar";
}

export function getPageSeoEntry(path: LocalizedPageKey, lang: Lang): PageSeoEntry {
  return PAGE_METADATA[path][lang];
}

export function buildLocalizedPageMetadata(path: LocalizedPageKey, lang: Lang): Metadata {
  const entry = getPageSeoEntry(path, lang);
  return buildPageMetadata({
    title: entry.title,
    description: entry.description,
    path,
    keywords: entry.keywords,
    lang,
  });
}

/** Absolute URL for OG/Twitter images (relative paths → APP_URL). */
export function absoluteImageUrl(image: string): string {
  if (!image) return `${APP_URL}/images/web-logo.png`;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return `${APP_URL}${image.startsWith("/") ? image : `/${image}`}`;
}

function defaultRobots(noIndex: boolean): Metadata["robots"] {
  if (noIndex) return { index: false, follow: false };
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}

function ogTitle(title: string, lang: Lang): string {
  if (lang === "ar") return title;
  return `${title} | ${BRAND_NAME}`;
}

function sharedOpenGraph(
  title: string,
  description: string,
  url: string,
  image: string,
  lang: Lang,
  type: "website" | "article" = "website",
): NonNullable<Metadata["openGraph"]> {
  const absImage = absoluteImageUrl(image);
  return {
    type,
    url,
    title: ogTitle(title, lang),
    description,
    siteName: BRAND_NAME,
    locale: lang === "ar" ? OG_LOCALE_AR : OG_LOCALE_EN,
    alternateLocale: lang === "ar" ? [OG_LOCALE_EN] : [OG_LOCALE_AR],
    images: [{ url: absImage, width: 1200, height: 630, alt: title }],
  };
}

function sharedTwitter(
  title: string,
  description: string,
  image: string,
  lang: Lang,
): Metadata["twitter"] {
  return {
    card: "summary_large_image",
    site: TWITTER_SITE,
    creator: TWITTER_SITE,
    title: ogTitle(title, lang),
    description,
    images: [absoluteImageUrl(image)],
  };
}

export function buildPageMetadata({
  title,
  description,
  path,
  keywords = [],
  image = "/images/web-logo.png",
  noIndex = false,
  ogType = "website",
  lang = "en",
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
        "ar-EG": url,
        en: url,
        ar: url,
        "x-default": url,
      },
    },
    robots: defaultRobots(noIndex),
    openGraph: sharedOpenGraph(title, description, url, image, lang, ogType),
    twitter: sharedTwitter(title, description, image, lang),
  };
}

export type CollectionSeoKey = "classic" | "seasonal" | "stuffed" | "gifts";

const COLLECTION_SEO: Record<
  CollectionSeoKey,
  { title: string; description: string; keywords: string[] }
> = {
  classic: {
    title: "Classic Cookie Collection in New Cairo",
    description:
      "Shop timeless Cookie Bite classics — buttery dough, Belgian chocolate, and crowd favorites delivered in New Cairo.",
    keywords: ["classic cookies cairo", "chocolate chip cookies egypt", "cookie bite classics"],
  },
  seasonal: {
    title: "Seasonal Cookie Specials in New Cairo",
    description:
      "Limited-batch seasonal cookies from Cookie Bite — matcha, holiday flavors, and rotating drops in New Cairo.",
    keywords: ["seasonal cookies cairo", "limited edition cookies egypt", "holiday cookies new cairo"],
  },
  stuffed: {
    title: "Stuffed Cookies in New Cairo",
    description:
      "Gooey stuffed cookies with Nutella, caramel, and premium fillings — order from Cookie Bite in New Cairo.",
    keywords: ["stuffed cookies cairo", "nutella cookies egypt", "filled cookies new cairo"],
  },
  gifts: {
    title: "Cookie Gift Boxes & Occasions in New Cairo",
    description:
      "Premium cookie gift boxes for birthdays, celebrations, and corporate gifting — Cookie Bite New Cairo.",
    keywords: ["cookie gift box cairo", "birthday cookie gifts", "corporate cookie gifts egypt"],
  },
};

export function buildCollectionMetadata(slug: CollectionSeoKey): Metadata {
  const meta = COLLECTION_SEO[slug];
  return buildPageMetadata({
    title: meta.title,
    description: meta.description,
    path: `/collections/${slug}`,
    keywords: meta.keywords,
  });
}

export function buildShopCategoryMetadata(category: string): Metadata {
  const encoded = encodeURIComponent(category);
  const title = `${category} Cookies in New Cairo`;
  const description = `Browse ${category} cookies from Cookie Bite — handcrafted, fresh, and delivered in New Cairo.`;
  return buildPageMetadata({
    title,
    description,
    path: `/shop?cat=${encoded}`,
    keywords: [
      `${category.toLowerCase()} cookies cairo`,
      "cookie delivery new cairo",
      "cookie bite shop",
    ],
  });
}

export function buildProductMetadata(product: Product, slug: string): Metadata {
  const title = `${product.name} Cookies in New Cairo`;
  const description = `${product.description} Order ${product.name} online from Cookie Bite with premium ingredients and fast support in New Cairo.`;
  const image = product.images?.[0] ?? product.image;
  return {
    title,
    description,
    keywords: [
      `${product.name.toLowerCase()} cookie`,
      "new cairo cookies",
      "cookie delivery egypt",
      "cookie bite product",
    ],
    alternates: { canonical: `/shop/${slug}` },
    robots: defaultRobots(false),
    openGraph: sharedOpenGraph(
      product.name,
      `${product.description} Shop this Cookie Bite favorite in New Cairo.`,
      `${APP_URL}/shop/${slug}`,
      image,
      "en",
    ),
    twitter: sharedTwitter(
      product.name,
      `${product.description} Order now from Cookie Bite.`,
      image,
      "en",
    ),
  };
}

export type ArticleMetadataInput = {
  slug: string;
  title: string;
  description: string;
  coverUrl?: string | null;
  publishedAt?: string;
  authorName?: string;
  focusKeyword?: string;
};

export function buildArticleMetadata(post: ArticleMetadataInput): Metadata {
  const seoTitle = post.title;
  const path = `/blog/${post.slug}`;
  const image = post.coverUrl ?? "/images/web-logo.png";
  const keywords = [
    "cookie blog cairo",
    "cookie bite blog",
    ...(post.focusKeyword ? [post.focusKeyword] : []),
  ];
  return {
    title: seoTitle,
    description: post.description,
    keywords,
    alternates: { canonical: path },
    robots: defaultRobots(false),
    authors: post.authorName ? [{ name: post.authorName }] : [{ name: BRAND_NAME }],
    category: "Food & Drink",
    openGraph: {
      type: "article",
      url: `${APP_URL}${path}`,
      title: `${seoTitle} | ${BRAND_NAME}`,
      description: post.description,
      siteName: BRAND_NAME,
      locale: OG_LOCALE_EN,
      alternateLocale: [OG_LOCALE_AR],
      images: [{ url: absoluteImageUrl(image), width: 1200, height: 630, alt: seoTitle }],
      publishedTime: post.publishedAt,
      modifiedTime: post.publishedAt,
      authors: post.authorName ? [post.authorName] : [BRAND_NAME],
    },
    twitter: sharedTwitter(seoTitle, post.description, image, "en"),
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): string {
  const itemListElement = items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `${APP_URL}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
  }));

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  });
}

export function buildFaqPageJsonLd(
  items: Array<{ q: string; a: string }>,
): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  });
}

export function brandSameAsLinks(): string[] {
  return [
    BRAND.social.instagram,
    BRAND.social.facebook,
    BRAND.social.tiktok,
    "https://x.com/cookiebite8",
  ];
}

export function buildLocalBusinessJsonLd(): string {
  const payload = {
    "@context": "https://schema.org",
    "@type": ["Bakery", "LocalBusiness"],
    "@id": `${APP_URL}/#localbusiness`,
    name: BRAND_NAME,
    url: APP_URL,
    logo: `${APP_URL}/images/web-logo.png`,
    image: `${APP_URL}/images/web-logo.png`,
    telephone: `+${BRAND.whatsappE164}`,
    email: BRAND.email,
    priceRange: "$$",
    servesCuisine: "Cookies",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Fifth Settlement",
      addressLocality: "New Cairo",
      addressRegion: "Cairo",
      addressCountry: "EG",
    },
    areaServed: [
      { "@type": "City", name: "New Cairo" },
      { "@type": "City", name: "Cairo" },
      { "@type": "Country", name: "Egypt" },
    ],
    sameAs: brandSameAsLinks(),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: `+${BRAND.whatsappE164}`,
      email: BRAND.ordersEmail,
      availableLanguage: ["English", "Arabic"],
    },
  };
  return JSON.stringify(payload);
}

export function buildProductJsonLd(product: Product, slug: string): string {
  const images = (product.images?.length ? product.images : [product.image]).map(absoluteImageUrl);
  const inStock =
    product.stock == null || product.stock > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  const payload = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: images,
    description: product.description,
    sku: product.productUuid ?? product.id,
    mpn: product.productUuid ?? product.id,
    brand: { "@type": "Brand", name: BRAND_NAME },
    category: product.category,
    offers: {
      "@type": "Offer",
      url: `${APP_URL}/shop/${slug}`,
      priceCurrency: BRAND.currency,
      price: String(product.price),
      itemCondition: "https://schema.org/NewCondition",
      availability: inStock,
      seller: {
        "@type": "Organization",
        name: BRAND_NAME,
        url: APP_URL,
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "EG",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 2, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "EG",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
        url: `${APP_URL}/help/returns`,
      },
    },
  };
  return JSON.stringify(payload);
}

export function buildBlogPostingJsonLd(input: {
  headline: string;
  slug: string;
  description: string;
  coverUrl?: string | null;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  wordCount?: number;
}): string {
  const payload = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.headline,
    description: input.description,
    inLanguage: ["en", "ar"],
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    image: absoluteImageUrl(input.coverUrl ?? "/images/web-logo.png"),
    author: {
      "@type": "Person",
      name: input.authorName ?? BRAND_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME,
      url: APP_URL,
      logo: { "@type": "ImageObject", url: `${APP_URL}/images/web-logo.png` },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${APP_URL}/blog/${input.slug}`,
    },
    ...(input.wordCount ? { wordCount: input.wordCount } : {}),
  };
  return JSON.stringify(payload);
}
