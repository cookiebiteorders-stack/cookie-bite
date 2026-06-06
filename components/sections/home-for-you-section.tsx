import type { Product } from "@/lib/data";
import { getTrendingRecommendations } from "@/lib/recommendations/fetch-recommendations";
import { HomeForYouRail } from "@/components/sections/home-for-you-rail";
import { getLangFromCookies } from "@/lib/seo/server";

/** Personalized picks — trending re-ranked by session signals on the client. */
export async function HomeForYouSection() {
  const lang = await getLangFromCookies();
  const trending = await getTrendingRecommendations(12, lang);
  if (trending.length < 2) return null;
  return <HomeForYouRail trending={trending} />;
}
