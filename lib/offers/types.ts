export type OfferAddonItem = {
  addon_id: string;
  option_id: string;
};

export type BundleOfferRow = {
  id: string;
  name_en: string;
  name_ar: string;
  product_ids: string[];
  addon_items: OfferAddonItem[];
  offer_price_egp: number;
  original_total_egp: number;
  avg_price_per_product_egp: number | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type OfferCatalogProduct = {
  id: string;
  slug: string;
  title_en: string | null;
  title_ar: string | null;
  name: string;
  description_en: string | null;
  description_ar: string | null;
  price_egp: number;
  compare_price_egp: number | null;
  sku: string | null;
  category: string | null;
  stock: number;
  is_active: boolean;
  images: unknown[];
  badges: string[] | null;
  dietary: string[];
};

export type OfferCatalogAddonOption = {
  addon_id: string;
  addon_name: string;
  category_name: string;
  option_id: string;
  option_name: string;
  price: number;
  stock: number | null;
  weight_grams: number | null;
  selection_type: string;
  required: boolean;
};

export type EnrichedBundleOffer = BundleOfferRow & {
  products: OfferCatalogProduct[];
  addons: OfferCatalogAddonOption[];
  savings_egp: number;
  is_currently_valid: boolean;
};
