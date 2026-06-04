export type HelpCenterCategoryId =
  | "account"
  | "returns"
  | "orders"
  | "gifting"
  | "products"
  | "payment";

export type HelpCenterBlock = {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
  steps?: string[];
  callout?: { variant: "tip" | "warn"; text: string };
};

export type Localized<T> = { ar: T; en: T };

export type HelpCenterArticle = {
  id: string;
  categoryId: HelpCenterCategoryId;
  icon: string;
  readTime: Localized<string>;
  title: Localized<string>;
  description: Localized<string>;
  preview: Localized<string>;
  blocks: Localized<HelpCenterBlock[]>;
  relatedLinks: Array<{ href: string; label: Localized<string> }>;
};
