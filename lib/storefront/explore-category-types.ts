export const EXPLORE_CATEGORY_KEYS = ["classic", "seasonal", "gifts", "bites"] as const;

export type ExploreCategoryKey = (typeof EXPLORE_CATEGORY_KEYS)[number];

export type ExploreCategoryCard = {
  key: ExploreCategoryKey;
  href: string;
  image: string;
};
