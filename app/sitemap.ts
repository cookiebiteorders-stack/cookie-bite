import type { MetadataRoute } from "next";
import { getSanityClient } from "@/lib/sanity/client";
import { BLOG_POSTS_INDEX_QUERY } from "@/lib/sanity/queries";
import { APP_URL } from "@/lib/seo";
import type { CollectionSeoKey } from "@/lib/seo";
import { listAllActiveSlugs } from "@/lib/storefront/pdp-data";

const COLLECTION_SLUGS: CollectionSeoKey[] = ["classic", "seasonal", "stuffed", "gifts"];

const staticRoutes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/shop", changeFrequency: "daily", priority: 0.95 },
  { path: "/gift-box", changeFrequency: "weekly", priority: 0.9 },
  { path: "/gift-box/build", changeFrequency: "weekly", priority: 0.92 },
  { path: "/gift-ideas", changeFrequency: "weekly", priority: 0.82 },
  { path: "/our-cookies", changeFrequency: "weekly", priority: 0.85 },
  { path: "/our-story", changeFrequency: "monthly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.8 },
  { path: "/help", changeFrequency: "monthly", priority: 0.8 },
  { path: "/help/faq", changeFrequency: "monthly", priority: 0.75 },
  { path: "/help/returns", changeFrequency: "monthly", priority: 0.7 },
  { path: "/help/delivery", changeFrequency: "monthly", priority: 0.72 },
  { path: "/help/allergens", changeFrequency: "monthly", priority: 0.72 },
  { path: "/help/payments", changeFrequency: "monthly", priority: 0.72 },
  { path: "/help/gifting", changeFrequency: "monthly", priority: 0.72 },
  { path: "/delivery/new-cairo", changeFrequency: "weekly", priority: 0.88 },
  { path: "/delivery/areas", changeFrequency: "weekly", priority: 0.85 },
  { path: "/corporate-gifting", changeFrequency: "weekly", priority: 0.84 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const productSlugs = await listAllActiveSlugs();

  let blogPosts: Array<{ slug: string; _updatedAt?: string }> = [];
  const sanity = getSanityClient();
  if (sanity) {
    try {
      blogPosts = await sanity.fetch(BLOG_POSTS_INDEX_QUERY);
    } catch {
      blogPosts = [];
    }
  }

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${APP_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    images:
      route.path === "/"
        ? [
            `${APP_URL}/images/web-logo.png`,
            `${APP_URL}/images/sign-in-side.png`,
          ]
        : undefined,
  }));

  const productEntries: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${APP_URL}/shop/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${APP_URL}/blog/${post.slug}`,
    lastModified: post._updatedAt ? new Date(post._updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.65,
  }));

  const collectionEntries: MetadataRoute.Sitemap = COLLECTION_SLUGS.map((slug) => ({
    url: `${APP_URL}/collections/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...collectionEntries, ...productEntries, ...blogEntries];
}
