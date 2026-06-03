export type SuggestedProductRef = {
  product_id: string;
  quantity: number;
};

export type OccasionTemplate = {
  id: string;
  name_ar: string;
  name_en: string | null;
  occasion_type: string;
  emoji: string | null;
  description_ar: string | null;
  description_en: string | null;
  suggested_products: SuggestedProductRef[];
  suggested_addons: string[];
  suggested_message_ar: string | null;
  suggested_message_en: string | null;
  suggested_box_code: string | null;
  ribbon_color: string | null;
  wrap_style: string | null;
  card_design: string | null;
  cover_image: string | null;
  sort_order: number;
  is_featured: boolean;
};
