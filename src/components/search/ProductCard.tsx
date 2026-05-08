"use client";

import Image from "next/image";
import { Heart } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { StarRating } from "@/src/components/ui/StarRating";
import { Badge } from "@/src/components/ui/Badge";
import { Modal } from "@/src/components/ui/Modal";
import { buttonClassName } from "@/components/ui/button";
import type { Product } from "@/src/types/product";
import { useCart } from "@/src/hooks/useCart";
import { useToast } from "@/src/hooks/useToast";
import { useState } from "react";

export function SearchProductCard({ product }: { product: Product }) {
  const { addItem, openDrawer } = useCart();
  const toast = useToast();
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  function onAdd() {
    addItem({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.images[0],
      maxStock: product.stockCount || 1,
    });
    toast.cart("Added to cart", product.name);
    openDrawer();
  }

  return (
    <Card variant="product" className="group overflow-hidden p-0">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
          sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 33vw"
        />
        <button
          type="button"
          aria-label="Add to wishlist"
          className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-cb-border bg-cb-surface/85 text-cb-text-strong"
        >
          <Heart className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setQuickViewOpen(true)}
          className="absolute bottom-2 right-2 rounded-md border border-cb-border bg-cb-surface/90 px-2 py-1 text-xs font-semibold text-cb-text-strong"
        >
          Quick View
        </button>
        {product.discount ? (
          <Badge variant="accent" className="absolute left-2 top-2">
            -{product.discount}%
          </Badge>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <p className="text-[11px] uppercase tracking-wider text-cb-text-muted">{product.brand}</p>
        <h3 className="line-clamp-2 text-sm font-semibold text-cb-text-strong">{product.name}</h3>
        <StarRating rating={product.rating} count={product.reviewCount} />
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-cb-text-strong">${product.price}</span>
          {product.originalPrice ? (
            <span className="text-xs text-cb-text-muted line-through">${product.originalPrice}</span>
          ) : null}
        </div>
        <button type="button" onClick={onAdd} className={buttonClassName("primary", "mt-1 w-full rounded-md")}>
          Add to Cart
        </button>
      </div>
      <Modal
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
        title={product.name}
        footer={
          <button
            type="button"
            onClick={() => {
              onAdd();
              setQuickViewOpen(false);
            }}
            className={buttonClassName("primary", "w-full rounded-md")}
          >
            Add to Cart
          </button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-cb-cream">
            <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="140px" />
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-cb-text-muted">{product.brand}</p>
            <p className="text-sm text-cb-text-muted">{product.description}</p>
            <StarRating rating={product.rating} count={product.reviewCount} />
            <p className="text-lg font-bold text-cb-text-strong">${product.price}</p>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export function SearchProductRow({ product }: { product: Product }) {
  const { addItem, openDrawer } = useCart();
  const toast = useToast();

  function onAdd() {
    addItem({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.images[0],
      maxStock: product.stockCount || 1,
    });
    toast.cart("Added to cart", product.name);
    openDrawer();
  }

  return (
    <Card variant="product" className="overflow-hidden p-3 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-center">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-cb-cream">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width:640px) 100vw, 180px"
          />
          {product.discount ? (
            <Badge variant="accent" className="absolute left-2 top-2">
              -{product.discount}%
            </Badge>
          ) : null}
        </div>
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-cb-text-muted">{product.brand}</p>
          <h3 className="text-base font-semibold text-cb-text-strong">{product.name}</h3>
          <p className="line-clamp-3 text-sm text-cb-text-muted">{product.description}</p>
          <StarRating rating={product.rating} count={product.reviewCount} />
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-cb-text-strong">${product.price}</span>
            {product.originalPrice ? (
              <span className="text-xs text-cb-text-muted line-through">${product.originalPrice}</span>
            ) : null}
          </div>
        </div>
        <div className="sm:min-w-[140px]">
          <button type="button" onClick={onAdd} className={buttonClassName("primary", "w-full rounded-md")}>
            Add to Cart
          </button>
        </div>
      </div>
    </Card>
  );
}

