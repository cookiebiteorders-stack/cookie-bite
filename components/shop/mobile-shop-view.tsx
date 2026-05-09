"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Heart, Plus } from "lucide-react";
import { PRODUCTS, type Product } from "@/lib/data";
import { cn } from "@/lib/utils";

const categories = ["All", "Classic", "Chocolate Lovers", "Stuffed", "Premium", "Seasonal"] as const;

const DEMO_PRODUCTS: Product[] = PRODUCTS.length > 0 ? PRODUCTS : [
  { id: "choc-chip", name: "Chocolate Chip Classic", description: "Buttery dough with Belgian chocolate chips", price: 45, image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=400&q=80", category: "Classic", badges: ["bestseller"] },
  { id: "double-choc", name: "Double Chocolate Fudge", description: "Rich cocoa dough with dark chocolate chunks", price: 55, image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=80", category: "Chocolate Lovers", badges: ["trending"] },
  { id: "stuffed-nutella", name: "Stuffed Nutella Cookie", description: "Crispy outside, molten Nutella center", price: 65, image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80", category: "Stuffed", badges: ["new"] },
  { id: "red-velvet", name: "Red Velvet White Chip", description: "Soft red velvet with white chocolate chips", price: 50, image: "https://images.unsplash.com/photo-1602351447937-745cb720612f?auto=format&fit=crop&w=400&q=80", category: "Premium" },
  { id: "oatmeal-raisin", name: "Oatmeal Raisin", description: "Chewy oats with plump raisins and cinnamon", price: 40, image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80", category: "Classic" },
  { id: "peanut-butter", name: "Peanut Butter Crunch", description: "Crunchy peanut butter with a salted edge", price: 50, image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=400&q=80", category: "Classic" },
  { id: "matcha", name: "Matcha White Chocolate", description: "Japanese matcha with white chocolate drizzle", price: 60, image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=400&q=80", category: "Seasonal" },
  { id: "salted-caramel", name: "Salted Caramel Stuffed", description: "Gooey caramel center with sea salt flakes", price: 65, image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=400&q=80", category: "Stuffed", badges: ["bestseller"] },
];

export function MobileShopView() {
  const [cat, setCat] = useState<(typeof categories)[number]>("All");
  const products = DEMO_PRODUCTS;
  const filtered = useMemo(() => {
    if (cat === "All") return products;
    return products.filter(p => p.category === cat);
  }, [cat, products]);

  return (
    <div className="md:hidden bg-cb-cream min-h-screen">
      {/* Category Filter Tabs */}
      <div className="mobile-filter-tabs">
        {categories.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={cn("mobile-filter-tab", cat === c && "mobile-filter-tab--active")}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mobile-spacer-md" />

      {/* Product Grid */}
      <div className="mobile-product-grid">
        {filtered.map(p => (
          <div key={p.id} className="mobile-product-card">
            <div className="mobile-product-card__img-wrap">
              <Image src={p.image} alt={p.name} fill className="mobile-product-card__img" sizes="50vw" />
              {p.badges?.[0] && (
                <span className="mobile-product-card__badge">
                  {p.badges[0] === "bestseller" ? "Best Seller" : p.badges[0] === "trending" ? "Trending" : "New"}
                </span>
              )}
              <button type="button" className="mobile-product-card__heart" aria-label="Add to wishlist">
                <Heart />
              </button>
            </div>
            <div className="mobile-product-card__body">
              <p className="mobile-product-card__name">{p.name}</p>
              <p className="mobile-product-card__desc">{p.description}</p>
              <div className="mobile-product-card__price-row">
                <span className="mobile-product-card__price">{p.price} EGP</span>
                <button type="button" className="mobile-product-card__add-btn" aria-label="Add to cart">
                  <Plus />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center px-4 py-10 text-cb-text-muted">
          No cookies match — try another category.
        </p>
      )}

      <button type="button" className="mobile-btn-view-more">
        View More Cookies
      </button>

      <div className="mobile-spacer-lg" />
    </div>
  );
}
