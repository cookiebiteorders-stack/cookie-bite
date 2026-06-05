import "server-only";

import { unstable_cache } from "next/cache";
import { BRAND } from "@/lib/brand";
import type { Lang } from "@/lib/i18n/translations";
import { fetchInstagramOEmbed } from "@/lib/instagram/oembed";
import type { InstagramFeedItem } from "@/lib/instagram/types";
import { getCachedHomepageFeaturedProducts } from "@/lib/storefront/cached-catalog";

export type { InstagramFeedItem };

const FEED_LIMIT = 8;

function parsePostUrlsFromEnv(): string[] {
  const raw = process.env.INSTAGRAM_FEED_POST_URLS?.trim();
  if (!raw) return [];
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => /^https:\/\/(www\.)?instagram\.com\/(p|reel)\//i.test(s));
}

async function fetchInstagramItems(urls: string[]): Promise<InstagramFeedItem[]> {
  const items: InstagramFeedItem[] = [];
  for (const url of urls.slice(0, FEED_LIMIT)) {
    const embed = await fetchInstagramOEmbed(url);
    if (!embed) continue;
    items.push({
      id: embed.permalink,
      permalink: embed.permalink,
      imageUrl: embed.thumbnailUrl,
      source: "instagram",
    });
  }
  return items;
}

async function catalogFallbackItems(lang: Lang): Promise<InstagramFeedItem[]> {
  const products = await getCachedHomepageFeaturedProducts(FEED_LIMIT, lang);
  return products.map((p) => ({
    id: `catalog-${p.id}`,
    permalink: BRAND.social.instagram,
    imageUrl: p.image,
    source: "catalog" as const,
  }));
}

async function resolveInstagramFeedUncached(lang: Lang): Promise<InstagramFeedItem[]> {
  const postUrls = parsePostUrlsFromEnv();
  const fromIg = postUrls.length > 0 ? await fetchInstagramItems(postUrls) : [];

  if (fromIg.length >= 4) {
    return fromIg.slice(0, FEED_LIMIT);
  }

  const catalog = await catalogFallbackItems(lang);
  const merged = [...fromIg];
  for (const item of catalog) {
    if (merged.length >= FEED_LIMIT) break;
    if (!merged.some((m) => m.imageUrl === item.imageUrl)) {
      merged.push(item);
    }
  }
  return merged.slice(0, FEED_LIMIT);
}

export function getInstagramFeedItems(lang: Lang): Promise<InstagramFeedItem[]> {
  const postKey = parsePostUrlsFromEnv().join("|") || "catalog-only";
  return unstable_cache(
    () => resolveInstagramFeedUncached(lang),
    ["instagram-feed", lang, postKey],
    { revalidate: 3600, tags: ["instagram-feed"] },
  )();
}
