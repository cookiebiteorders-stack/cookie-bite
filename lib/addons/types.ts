export type AddonType = "single_choice" | "multiple_choice";

export type AddonSize = "small" | "medium" | "large" | string;

export type AddonOption = {
  id: string;
  name: string;
  size?: AddonSize | null;
  /** وزن العنصر بالجرام */
  weight_grams?: number | null;
  price: number;
  /** مخزون متاح — 0 = غير متوفر */
  stock?: number | null;
  /** حد أقصى للكمية في الطلب الواحد */
  quantity_limit?: number | null;
  default_selected: boolean;
};

export type AddonCategory = {
  id: string;
  name: string;
  description?: string | null;
  selection_type: AddonType;
  required: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  /** سجل addons المرتبط (حاوية الخيارات) */
  addon_id?: string | null;
  items?: AddonOption[];
};

export type Addon = {
  id: string;
  name: string;
  description?: string | null;
  type: AddonType;
  required: boolean;
  options: AddonOption[];
  category_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CartSelectedAddonOption = {
  option_id: string;
  quantity: number;
  price_snapshot: number;
};

export type CartSelectedAddon = {
  addon_id: string;
  options: CartSelectedAddonOption[];
};
