export type AddonType = "single_choice" | "multiple_choice";

export type AddonSize = "small" | "medium" | "large" | string;

export type AddonOption = {
  id: string;
  name: string;
  size?: AddonSize | null;
  price: number;
  quantity_limit?: number | null;
  default_selected: boolean;
};

export type Addon = {
  id: string;
  name: string;
  description?: string | null;
  type: AddonType;
  required: boolean;
  options: AddonOption[];
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
