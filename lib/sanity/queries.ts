export const PRODUCTS_QUERY = `
*[_type == "product" && is_active == true] | order(_createdAt desc) {
  _id,
  "slug": slug.current,
  title_en,
  title_ar,
  description_en,
  description_ar,
  price,
  compare_price,
  badges,
  dietary,
  seasons,
  pieces_count,
  "images": images[]{
    "url": asset->url,
    alt_en,
    alt_ar
  },
  "category": category->{ title_en, title_ar, "slug": slug.current }
}
`;

export const PRODUCT_BY_SLUG_QUERY = `
*[_type == "product" && slug.current == $slug && is_active == true][0] {
  _id,
  "slug": slug.current,
  title_en,
  title_ar,
  description_en,
  description_ar,
  price,
  compare_price,
  stock_count,
  sku,
  weight_grams,
  pieces_count,
  badges,
  dietary,
  seasons,
  "images": images[]{ "url": asset->url, alt_en, alt_ar },
  "category": category->{ title_en, title_ar, "slug": slug.current }
}
`;

export const SITE_SETTINGS_QUERY = `
*[_type == "siteSettings"][0] {
  announcement_bar_en,
  announcement_bar_ar,
  working_hours,
  free_delivery_threshold,
  contact_phone,
  contact_address_en,
  contact_address_ar
}
`;

export const BLOG_POSTS_INDEX_QUERY = `
*[_type == "blogPost" && is_published == true] | order(_updatedAt desc) {
  _id,
  "slug": slug.current,
  title_en,
  title_ar,
  excerpt_en,
  excerpt_ar,
  "coverUrl": cover_image.asset->url,
  _updatedAt
}
`;

export const BLOG_POST_BY_SLUG_QUERY = `
*[_type == "blogPost" && slug.current == $slug && is_published == true][0] {
  _id,
  "slug": slug.current,
  title_en,
  title_ar,
  excerpt_en,
  excerpt_ar,
  body_en,
  body_ar,
  "coverUrl": cover_image.asset->url,
  _updatedAt,
  date_published,
  author_name,
  seo_title,
  seo_description,
  focus_keyword,
  related_product_slugs
}
`;

/** Editorial calendar — create matching documents in Sanity Studio */
export const BLOG_SEED_TITLES = [
  { slug: "best-cookie-gift-boxes-new-cairo", title_en: "Best Cookie Gift Boxes in New Cairo" },
  { slug: "how-to-store-fresh-cookies", title_en: "How to Store Fresh Cookies" },
  { slug: "corporate-gifting-guide-egypt", title_en: "Corporate Gifting Guide Egypt" },
  { slug: "seasonal-flavors-2026", title_en: "Seasonal Cookie Flavors 2026" },
  { slug: "cookie-delivery-zones-explained", title_en: "Cookie Delivery Zones Explained" },
  { slug: "birthday-cookie-ideas-cairo", title_en: "Birthday Cookie Ideas in Cairo" },
  { slug: "behind-the-kitchen-baking-process", title_en: "Behind the Kitchen: Our Baking Process" },
  { slug: "eid-ramadan-cookie-gifting", title_en: "Eid & Ramadan Cookie Gifting" },
] as const;
