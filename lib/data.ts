import { BRAND } from "@/lib/brand";

export const SITE = {
  name: "Cookie Bite",
  tagline: "Small-batch cookies · New Cairo",
  handle: "@cookiebite8",
};

export type NavItem = { href: string; label: string };

/** روابط أساسية (فوتر، خرائط قديمة) */
export const NAV_LINKS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/gift-box", label: "Gifts" },
  { href: "/our-cookies", label: "Our Cookies" },
  { href: "/our-story", label: "Our Story" },
  { href: "/contact", label: "Contact" },
];

/** شريط الثقة — Master Doc §4.2 */
export const ANNOUNCEMENT_ITEMS = [
  {
    icon: "truck" as const,
    text: `Free delivery over ${BRAND.freeDeliveryThresholdEgp} EGP`,
  },
  { icon: "clock" as const, text: "Fresh baked to order" },
  { icon: "heart" as const, text: "Gift wrapping available" },
  {
    icon: "phone" as const,
    text: `WhatsApp: ${BRAND.phoneDisplay}`,
  },
  { icon: "leaf" as const, text: "100% natural ingredients" },
];

export const IMAGES = {
  heroBox:
    "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1200&q=80",
  heroStack:
    "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80",
  storyMug:
    "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=900&q=80",
  giftBox:
    "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=1200&q=80",
  ingredients:
    "https://images.unsplash.com/photo-1586444248909-04c3d5c8c0e0?auto=format&fit=crop&w=900&q=80",
  /** Local asset: mascot (sign-in panel) */
  signIn: "/images/sign-in-side.png",
  /** Local asset: teddy mascot (sign-up panel) */
  signUp: "/images/sign-up-side.png",
};

export type Product = {
  /** Slug المستخدم في الروابط والسلة وعند الدفع */
  id: string;
  /** معرف UUID في جدول products (قائمة الرغبات وربط داخلي) */
  productUuid?: string;
  name: string;
  description: string;
  price: number;
  /** سعر قبل الخصم — يُعرض مشطوباً في المتجر */
  comparePrice?: number | null;
  image: string;
  /** معرض PDP — حتى 5 صور */
  images?: string[];
  /** فيديو اختياري في المعرض */
  videoUrl?: string | null;
  category: string;
  badges?: ("bestseller" | "new" | "trending" | "featured")[];
  /** مخزون تقريبي لعرض حالة التوفر في الواجهة */
  stock?: number;
  sku?: string | null;
  weightGrams?: number | null;
  piecesCount?: number | null;
  dietary?: string[];
  seasons?: string[];
};

export const PRODUCTS: Product[] = [];

export const GIFT_BOXES: Product[] = [];

/** كل المنتجات القابلة للبيع في PDP والسلة (كوكيز + صناديق هدايا). */
export const ALL_SELLABLE: Product[] = [...PRODUCTS, ...GIFT_BOXES];

export function getProductBySlug(slug: string): Product | undefined {
  return ALL_SELLABLE.find((p) => p.id === slug);
}

export const CATEGORY_CARDS = [
  {
    title: "Classic Collection",
    subtitle: "Timeless flavors",
    image:
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80",
    href: "/collections/classic",
  },
  {
    title: "Seasonal Specials",
    subtitle: "Limited batches",
    image:
      "https://images.unsplash.com/photo-1602351447937-745cb720612f?auto=format&fit=crop&w=800&q=80",
    href: "/collections/seasonal",
  },
  {
    title: "Gifts & Occasions",
    subtitle: "Boxes they’ll remember",
    image:
      "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=800&q=80",
    href: "/gift-box",
  },
  {
    title: "Bites & More",
    subtitle: "Mini treats & add-ons",
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80",
    href: "/shop",
  },
];

export type OurCookieSectionIcon = "cookie" | "heart" | "sparkles" | "star" | "leaf";

/** ترتيب وعرض مجموعات صفحة Our Cookies — المنتجات تُحمَّل من `/api/products` مثل المتجر. */
export const OUR_COOKIE_SECTION_DEFS: ReadonlyArray<{
  id: string;
  shopCategory: string;
  icon: OurCookieSectionIcon;
}> = [
  { id: "classic", shopCategory: "Classic", icon: "cookie" },
  { id: "chocolate", shopCategory: "Chocolate Lovers", icon: "heart" },
  { id: "stuffed", shopCategory: "Stuffed", icon: "sparkles" },
  { id: "premium", shopCategory: "Premium", icon: "star" },
  { id: "seasonal", shopCategory: "Seasonal", icon: "leaf" },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "The stuffed cookies are unreal — warm, gooey, and packaged like a gift. Our office orders weekly.",
    name: "Nour El-Din",
    role: "Product lead, Cairo",
    initial: "N",
    color: "bg-cb-peach-deep",
  },
  {
    quote:
      "Finally a cookie that tastes as good as it looks. The red velvet white chip is my comfort bite.",
    name: "Yasmin K.",
    role: "Food blogger",
    initial: "Y",
    color: "bg-cb-mint/40",
  },
  {
    quote:
      "Corporate gifting was seamless. Branded sleeves arrived on time and the team loved every flavor.",
    name: "Omar H.",
    role: "HR Manager",
    initial: "O",
    color: "bg-cb-peach",
  },
];

/** تنسيق مكوّن الشهادات الدائرية (صورة + اقتباس) */
export type CircularTestimonialItem = {
  quote: string;
  name: string;
  designation: string;
  src: string;
};

export const CIRCULAR_TESTIMONIALS: CircularTestimonialItem[] = [
  {
    quote: TESTIMONIALS[0].quote,
    name: TESTIMONIALS[0].name,
    designation: TESTIMONIALS[0].role,
    src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
  },
  {
    quote: TESTIMONIALS[1].quote,
    name: TESTIMONIALS[1].name,
    designation: TESTIMONIALS[1].role,
    src: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80",
  },
  {
    quote: TESTIMONIALS[2].quote,
    name: TESTIMONIALS[2].name,
    designation: TESTIMONIALS[2].role,
    src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80",
  },
];

export const INSTAGRAM_GRID = [
  "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1602351447937-745cb720612f?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=400&q=80",
];

export const STORY_SECTIONS = [
  {
    n: "01",
    title: "Where it all began",
    body: "What started as weekend bakes for friends became a small kitchen with a big heart — focused on honest ingredients and slow mixing.",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
    reverse: false,
  },
  {
    n: "02",
    title: "Crafted with care",
    body: "Every dough rests, every tray is rotated, and every cookie is cooled just right before it ever meets a box.",
    image:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=80",
    reverse: true,
  },
  {
    n: "03",
    title: "More than just cookies",
    body: "We obsess over texture — the thin crisp edge, the soft center, the way chocolate folds into butter.",
    image:
      "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=900&q=80",
    reverse: false,
  },
];
