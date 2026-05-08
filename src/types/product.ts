export type ProductCategory = "men" | "women" | "accessories" | "footwear";

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  subcategory: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  images: string[];
  sizes: string[];
  colors: ProductColor[];
  tags: string[];
  inStock: boolean;
  stockCount: number;
  isNew: boolean;
  isFeatured: boolean;
  description: string;
  createdAt: string;
}

