import { InstagramGrid } from "@/components/sections/instagram-grid";
import { getInstagramFeedItems } from "@/lib/instagram/feed";
import { getLangFromCookies } from "@/lib/seo/server";

export async function HomeInstagramGrid() {
  const lang = await getLangFromCookies();
  const items = await getInstagramFeedItems(lang);
  return <InstagramGrid items={items} />;
}
