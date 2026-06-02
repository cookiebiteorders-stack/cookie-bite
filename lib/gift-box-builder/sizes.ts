export type GiftBoxSizeConfig = {
  id: string;
  code: string;
  name: string;
  max_items: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export const DEFAULT_GIFT_BOX_SIZES: GiftBoxSizeConfig[] = [
  {
    id: "default-small",
    code: "small",
    name: "Small",
    max_items: 6,
    image_url: "/brand/gift-box/box-closed-ref.png",
    is_active: true,
    sort_order: 10,
  },
  {
    id: "default-medium",
    code: "medium",
    name: "Medium",
    max_items: 12,
    image_url: "/brand/gift-box/box-closed-ref.png",
    is_active: true,
    sort_order: 20,
  },
  {
    id: "default-large",
    code: "large",
    name: "Large",
    max_items: 24,
    image_url: "/brand/gift-box/box-closed-ref.png",
    is_active: true,
    sort_order: 30,
  },
];
