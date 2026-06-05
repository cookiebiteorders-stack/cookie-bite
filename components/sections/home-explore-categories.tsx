import { ExploreCategories } from "@/components/sections/explore-categories";
import { getExploreCategoryCards } from "@/lib/storefront/explore-category-cards";
import { getLangFromCookies } from "@/lib/seo/server";

export async function HomeExploreCategories() {
  const lang = await getLangFromCookies();
  const cards = await getExploreCategoryCards(lang);
  return <ExploreCategories cards={cards} />;
}
