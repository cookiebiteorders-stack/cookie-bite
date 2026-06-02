/** Catalog for Build Your Own Gift Box — spec §3 */

export type GiftBoxSize = {
  id: string;
  name: string;
  capacity: number;
  icon: string;
  description: string;
  badge: string | null;
};

export type BuilderProduct = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  category: string;
  tags: string[];
  imageUrl: string;
  /** Supabase product UUID — required for checkout */
  productUuid: string;
  slug?: string;
  availableQuantity?: number | null;
};

export const GIFT_BOX_BUILDER_DATA = {
  boxes: [
    {
      id: "little-bite",
      name: "The Little Bite",
      capacity: 6,
      icon: "🍪",
      description: "Perfect for a sweet gesture",
      badge: null,
    },
    {
      id: "sweet-spot",
      name: "The Sweet Spot",
      capacity: 12,
      icon: "🧁",
      description: "Most popular choice",
      badge: "⭐ Popular",
    },
    {
      id: "big-hug",
      name: "The Big Hug",
      capacity: 20,
      icon: "🎂",
      description: "For family & big celebrations",
      badge: null,
    },
    {
      id: "golden-bite",
      name: "The Golden Bite",
      capacity: 15,
      icon: "✨",
      description: "Luxury wooden box with ribbon",
      badge: "Luxury",
    },
  ] satisfies GiftBoxSize[],

  occasions: [
    { id: "birthday", label: "🎂 Birthday" },
    { id: "eid", label: "🌙 Eid" },
    { id: "ramadan", label: "☪️ Ramadan" },
    { id: "wedding", label: "💍 Wedding" },
    { id: "graduation", label: "🎓 Graduation" },
    { id: "anniversary", label: "💕 Anniversary" },
    { id: "thankyou", label: "🙏 Thank You" },
    { id: "baby", label: "👶 Baby Shower" },
    { id: "corporate", label: "💼 Corporate" },
    { id: "getwell", label: "🤒 Get Well" },
    { id: "christmas", label: "🎄 Christmas" },
    { id: "justbecause", label: "🌸 Just Because" },
  ],

  cardDesigns: [
    { id: "birthday", label: "🎂 Birthday", color: "#FF6B8A" },
    { id: "romantic", label: "💕 Romantic", color: "#E8496A" },
    { id: "minimalist", label: "◻️ Minimalist", color: "#888888" },
    { id: "kids", label: "🌈 Kids", color: "#7BBDE8" },
    { id: "eid", label: "🌙 Eid/Ramadan", color: "#5B7FA6" },
    { id: "corporate", label: "💼 Corporate", color: "#3B4252" },
  ],

  ribbonColors: [
    { id: "gold", hex: "#C9972A", label: "Gold" },
    { id: "red", hex: "#C0392B", label: "Red" },
    { id: "black", hex: "#2C2C2C", label: "Black" },
    { id: "pink", hex: "#F4A0BF", label: "Blush Pink" },
    { id: "ivory", hex: "#F5F0E6", label: "Ivory" },
    { id: "teal", hex: "#2A8A7A", label: "Teal" },
    { id: "purple", hex: "#7B5EA7", label: "Purple" },
    { id: "sage", hex: "#8BAF8B", label: "Sage" },
  ],

  wrapStyles: [
    { id: "kraft", label: "Kraft", icon: "📦", color: "#C8935A" },
    { id: "luxblack", label: "Luxury Black", icon: "⬛", color: "#2C2C2C" },
    { id: "floral", label: "Floral", icon: "🌸", color: "#F4A0BF" },
    { id: "transparent", label: "Clear", icon: "💎", color: "#B0D8F5" },
    { id: "christmas", label: "Festive", icon: "🎄", color: "#2A6B3A" },
  ],

  deliveryOptions: [
    { id: "sameday", name: "Same-Day Delivery", sub: "Order before 12 PM", price: 80 },
    { id: "scheduled", name: "Scheduled Delivery", sub: "Pick your date & time", price: 50 },
    { id: "recipient", name: "Direct to Recipient", sub: "Price hidden from recipient", price: 60 },
    { id: "pickup", name: "Store Pickup", sub: "Ready in 2 hours", price: 0 },
  ],
} as const;

/** Map builder box id → API box_size literal */
export function boxIdToApiSize(boxId: string | null): 6 | 12 | 24 {
  const box = GIFT_BOX_BUILDER_DATA.boxes.find((b) => b.id === boxId);
  if (!box) return 6;
  if (box.capacity <= 6) return 6;
  if (box.capacity <= 12) return 12;
  return 24;
}
