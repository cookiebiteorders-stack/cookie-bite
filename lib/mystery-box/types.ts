export type MysteryOccasion =
  | "birthday"
  | "ramadan"
  | "thanks"
  | "corporate"
  | "wedding";

export type MysteryBoxRule = {
  id: string;
  occasion: string;
  budget_min: number;
  budget_max: number;
  product_categories: string[];
  min_items: number;
  max_items: number;
  description_ar: string | null;
  description_en: string | null;
};

export type MysteryCandidateProduct = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  price: number;
  category: string;
  imageUrl: string;
  stock: number | null;
  dietary: string[];
};

export type MysteryBoxSelectionItem = {
  productId: string;
  slug: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  reason: string;
  imageUrl: string;
};

export type MysteryBoxGenerateResult = {
  occasion: MysteryOccasion;
  budget: number;
  boxSize: string;
  items: MysteryBoxSelectionItem[];
  totalPrice: number;
  totalItems: number;
  description: string;
  ruleId: string;
};
