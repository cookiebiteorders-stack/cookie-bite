/** Editorial SEO calendar — create matching `blogPost` documents in Sanity. */

export type BlogSeedCategory =
  | "gifting"
  | "local_seo"
  | "seasonal"
  | "operations"
  | "brand";

export type BlogSeedArticle = {
  slug: string;
  title_en: string;
  title_ar: string;
  category: BlogSeedCategory;
  /** Lower number = publish first in the editorial calendar */
  priority: number;
  focus_keyword: string;
};

export const BLOG_SEED_CATALOG: readonly BlogSeedArticle[] = [
  {
    slug: "best-cookie-gift-boxes-new-cairo",
    title_en: "Best Cookie Gift Boxes in New Cairo",
    title_ar: "أفضل علب هدايا كوكيز في القاهرة الجديدة",
    category: "local_seo",
    priority: 1,
    focus_keyword: "cookie gift boxes new cairo",
  },
  {
    slug: "corporate-gifting-guide-egypt",
    title_en: "Corporate Gifting Guide Egypt",
    title_ar: "دليل هدايا الشركات في مصر",
    category: "gifting",
    priority: 2,
    focus_keyword: "corporate cookie gifts egypt",
  },
  {
    slug: "birthday-cookie-ideas-cairo",
    title_en: "Birthday Cookie Ideas in Cairo",
    title_ar: "أفكار كوكيز أعياد ميلاد في القاهرة",
    category: "gifting",
    priority: 3,
    focus_keyword: "birthday cookies cairo",
  },
  {
    slug: "eid-ramadan-cookie-gifting",
    title_en: "Eid & Ramadan Cookie Gifting",
    title_ar: "هدايا كوكيز العيد والرمضان",
    category: "seasonal",
    priority: 4,
    focus_keyword: "eid ramadan cookie gifts",
  },
  {
    slug: "seasonal-flavors-2026",
    title_en: "Seasonal Cookie Flavors 2026",
    title_ar: "نكهات الكوكيز الموسمية 2026",
    category: "seasonal",
    priority: 5,
    focus_keyword: "seasonal cookie flavors",
  },
  {
    slug: "cookie-delivery-zones-explained",
    title_en: "Cookie Delivery Zones Explained",
    title_ar: "شرح مناطق توصيل الكوكيز",
    category: "operations",
    priority: 6,
    focus_keyword: "cookie delivery cairo zones",
  },
  {
    slug: "how-to-store-fresh-cookies",
    title_en: "How to Store Fresh Cookies",
    title_ar: "كيف تحفظ الكوكيز الطازجة",
    category: "operations",
    priority: 7,
    focus_keyword: "how to store fresh cookies",
  },
  {
    slug: "behind-the-kitchen-baking-process",
    title_en: "Behind the Kitchen: Our Baking Process",
    title_ar: "من المطبخ: رحلة الخبز عندنا",
    category: "brand",
    priority: 8,
    focus_keyword: "cookie bakery process cairo",
  },
] as const;

export type BlogSeedSortKey = "priority" | "category" | "title_en" | "slug";

const CATEGORY_ORDER: Record<BlogSeedCategory, number> = {
  local_seo: 0,
  gifting: 1,
  seasonal: 2,
  operations: 3,
  brand: 4,
};

export function sortBlogSeedCatalog(
  items: readonly BlogSeedArticle[],
  sortBy: BlogSeedSortKey,
): BlogSeedArticle[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (sortBy === "priority") return a.priority - b.priority;
    if (sortBy === "category") {
      const cat = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
      return cat !== 0 ? cat : a.priority - b.priority;
    }
    if (sortBy === "title_en") return a.title_en.localeCompare(b.title_en);
    return a.slug.localeCompare(b.slug);
  });
  return copy;
}

export function filterBlogSeedByCategory(
  items: readonly BlogSeedArticle[],
  category: BlogSeedCategory | "all",
): BlogSeedArticle[] {
  if (category === "all") return [...items];
  return items.filter((item) => item.category === category);
}

/** Legacy shape for imports that only need slug + title_en */
export const BLOG_SEED_TITLES = BLOG_SEED_CATALOG.map((post) => ({
  slug: post.slug,
  title_en: post.title_en,
}));
