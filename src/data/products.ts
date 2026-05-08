import type { Product, ProductCategory } from "@/src/types/product";

const categories: ProductCategory[] = ["men", "women", "accessories", "footwear"];
const brands = ["Aether", "Noir", "Luna", "Vertex", "Mono", "Northline"];
const colors = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#F2F2F2" },
  { name: "Navy", hex: "#1E2A52" },
  { name: "Olive", hex: "#5A6B3D" },
  { name: "Lime", hex: "#E8FF57" },
];
const sizes = ["XS", "S", "M", "L", "XL"];

function pick<T>(list: T[], index: number): T {
  return list[index % list.length];
}

function createProduct(index: number): Product {
  const id = `prod-${String(index + 1).padStart(3, "0")}`;
  const category = pick(categories, index);
  const brand = pick(brands, index);
  const price = 45 + (index % 12) * 7;
  const hasDiscount = index % 3 === 0;
  const originalPrice = hasDiscount ? price + 20 : undefined;
  const discount = hasDiscount ? Math.round(((originalPrice! - price) / originalPrice!) * 100) : undefined;
  const rating = 3.5 + ((index % 16) * 0.1);
  const inStock = index % 7 !== 0;
  return {
    id,
    name: `${brand} ${category} essential ${index + 1}`,
    brand,
    category,
    subcategory: category === "footwear" ? "sneakers" : "essentials",
    price,
    originalPrice,
    discount,
    rating: Number(Math.min(5, rating).toFixed(1)),
    reviewCount: 12 + index * 4,
    images: [
      `https://picsum.photos/seed/${id}-1/600/800`,
      `https://picsum.photos/seed/${id}-2/600/800`,
      `https://picsum.photos/seed/${id}-3/600/800`,
    ],
    sizes: sizes.slice(0, 3 + (index % 3)),
    colors: [pick(colors, index), pick(colors, index + 2)],
    tags: [category, brand.toLowerCase(), hasDiscount ? "sale" : "classic"],
    inStock,
    stockCount: inStock ? 4 + (index % 22) : 0,
    isNew: index < 10,
    isFeatured: index % 5 === 0,
    description:
      "Premium product with clean silhouette, durable materials, and everyday comfort. Designed for modern city movement.",
    createdAt: new Date(Date.now() - index * 86400000).toISOString(),
  };
}

export const PRODUCTS: Product[] = Array.from({ length: 50 }, (_, i) => createProduct(i));

