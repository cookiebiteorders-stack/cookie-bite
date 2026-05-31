/** Catalog for Build Your Own Gift Box — spec §3 */

export type GiftBoxSize = {
  id: string;
  name: string;
  capacity: number;
  basePrice: number;
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
  /** Supabase product UUID when loaded from API */
  productUuid?: string;
};

export const GIFT_BOX_BUILDER_DATA = {
  boxes: [
    {
      id: "little-bite",
      name: "The Little Bite",
      capacity: 6,
      basePrice: 450,
      icon: "🍪",
      description: "Perfect for a sweet gesture",
      badge: null,
    },
    {
      id: "sweet-spot",
      name: "The Sweet Spot",
      capacity: 12,
      basePrice: 850,
      icon: "🧁",
      description: "Most popular choice",
      badge: "⭐ Popular",
    },
    {
      id: "big-hug",
      name: "The Big Hug",
      capacity: 20,
      basePrice: 1450,
      icon: "🎂",
      description: "For family & big celebrations",
      badge: null,
    },
    {
      id: "golden-bite",
      name: "The Golden Bite",
      capacity: 15,
      basePrice: 2100,
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

  categories: ["All", "Cookies", "Brownies", "Chocolates", "Drinks", "Add-ons"] as const,

  products: [
    { id: "p01", name: "Classic Choco Chip", price: 175, emoji: "🍪", category: "Cookies", tags: [] },
    { id: "p02", name: "Red Velvet Cookie", price: 200, emoji: "🍪", category: "Cookies", tags: ["vegan"] },
    { id: "p03", name: "Pistachio Rose Cookie", price: 225, emoji: "🌹", category: "Cookies", tags: [] },
    { id: "p04", name: "Lemon Zest Cookie", price: 175, emoji: "🍋", category: "Cookies", tags: ["vegan", "gf"] },
    { id: "p05", name: "Salted Caramel Cookie", price: 200, emoji: "🍪", category: "Cookies", tags: [] },
    { id: "p06", name: "Double Choco Brownie", price: 250, emoji: "🟫", category: "Brownies", tags: [] },
    { id: "p07", name: "Nutella Swirl Brownie", price: 275, emoji: "🟤", category: "Brownies", tags: [] },
    { id: "p08", name: "Blondie Brownie", price: 225, emoji: "🟨", category: "Brownies", tags: ["gf"] },
    { id: "p09", name: "Dark Choco Truffle", price: 200, emoji: "🍫", category: "Chocolates", tags: ["vegan"] },
    { id: "p10", name: "Milk Choco Truffle", price: 200, emoji: "🍫", category: "Chocolates", tags: [] },
    { id: "p11", name: "White Choco Raspberry", price: 225, emoji: "🍓", category: "Chocolates", tags: [] },
    { id: "p12", name: "Salted Choco Bar", price: 250, emoji: "🍫", category: "Chocolates", tags: [] },
    { id: "p13", name: "Premium Coffee Sachet", price: 150, emoji: "☕", category: "Drinks", tags: [] },
    { id: "p14", name: "Hot Choco Mix", price: 175, emoji: "🍵", category: "Drinks", tags: ["vegan"] },
    { id: "p15", name: "Vanilla Chai Blend", price: 175, emoji: "🌿", category: "Drinks", tags: [] },
    { id: "p16", name: "Mini Teddy Bear", price: 400, emoji: "🧸", category: "Add-ons", tags: [] },
    { id: "p17", name: "Scented Candle", price: 500, emoji: "🕯️", category: "Add-ons", tags: [] },
    { id: "p18", name: "Mini Bouquet", price: 600, emoji: "💐", category: "Add-ons", tags: [] },
    { id: "p19", name: "Cute Mug", price: 450, emoji: "☕", category: "Add-ons", tags: [] },
    { id: "p20", name: "Balloon", price: 150, emoji: "🎈", category: "Add-ons", tags: [] },
  ] satisfies BuilderProduct[],

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
