import type { OccasionTemplate } from "@/lib/occasion-templates/types";

export type GiftOccasionCategoryId =
  | "birthday"
  | "celebrations"
  | "thanks"
  | "corporate"
  | "seasonal";

type BuilderCategory = {
  id: GiftOccasionCategoryId;
  translationKey:
    | "pages.giftBox.catBirthday"
    | "pages.giftBox.catCelebrations"
    | "pages.giftBox.catThankYou";
  action: "builder";
  occasionTypes: string[];
  defaultOccasion: string;
};

type NavigateCategory = {
  id: GiftOccasionCategoryId;
  translationKey: "pages.giftBox.catCorporate" | "pages.giftBox.catHoliday";
  action: "navigate";
  href: string;
};

export type GiftOccasionCategory = BuilderCategory | NavigateCategory;

export const GIFT_OCCASION_CATEGORIES: GiftOccasionCategory[] = [
  {
    id: "birthday",
    translationKey: "pages.giftBox.catBirthday",
    action: "builder",
    occasionTypes: ["birthday"],
    defaultOccasion: "birthday",
  },
  {
    id: "celebrations",
    translationKey: "pages.giftBox.catCelebrations",
    action: "builder",
    occasionTypes: ["wedding", "eid", "ramadan", "graduation", "anniversary"],
    defaultOccasion: "wedding",
  },
  {
    id: "thanks",
    translationKey: "pages.giftBox.catThankYou",
    action: "builder",
    occasionTypes: ["thanks", "thankyou"],
    defaultOccasion: "thanks",
  },
  {
    id: "corporate",
    translationKey: "pages.giftBox.catCorporate",
    action: "navigate",
    href: "/corporate-gifting",
  },
  {
    id: "seasonal",
    translationKey: "pages.giftBox.catHoliday",
    action: "navigate",
    href: "/collections/seasonal",
  },
];

export function pickTemplateForCategory(
  category: BuilderCategory,
  templates: OccasionTemplate[],
): OccasionTemplate | null {
  const featured = templates.find(
    (t) => category.occasionTypes.includes(t.occasion_type) && t.is_featured,
  );
  if (featured) return featured;
  return templates.find((t) => category.occasionTypes.includes(t.occasion_type)) ?? null;
}

export function resolveGiftOccasionHref(
  category: GiftOccasionCategory,
  templates: OccasionTemplate[],
): string {
  if (category.action === "navigate") return category.href;
  const template = pickTemplateForCategory(category, templates);
  const qs = new URLSearchParams({ occasion: category.defaultOccasion });
  if (template) qs.set("template", template.id);
  return `/gift-box/build?${qs.toString()}`;
}
