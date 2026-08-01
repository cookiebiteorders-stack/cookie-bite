"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/data";

type Props = {
  products: Product[];
  title?: string;
  subtitle?: string;
};

export function PdpRelatedProducts({ 
  products, 
  title = "You Might Also Like",
  subtitle = "Discover more delicious cookies"
}: Props) {
  if (!products.length) return null;

  return (
    <section className="mt-16">
      <SectionHeading
        variant="editorial"
        eyebrow="Related"
        title={title}
        subtitle={subtitle}
      />
      <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} layout="grid" />
        ))}
      </div>
    </section>
  );
}
