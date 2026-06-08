"use client";

import Link from "next/link";
import type { ChatProductCard } from "@/lib/mr-brownie/personas";
import { cn } from "@/lib/utils";

type MrBrownieChatProductCardProps = {
  product: ChatProductCard;
  locale: "ar" | "en";
  viewLabel: string;
  outOfStockLabel: string;
  onProductClick?: (product: ChatProductCard) => void;
};

export function MrBrownieChatProductCard({
  product,
  locale,
  viewLabel,
  outOfStockLabel,
  onProductClick,
}: MrBrownieChatProductCardProps) {
  const price = new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(product.price_egp);

  return (
    <Link
      href={product.shop_path}
      onClick={() => onProductClick?.(product)}
      className={cn(
        "cb-mr-brownie-product-card group flex min-w-[9.5rem] max-w-[11rem] shrink-0 flex-col overflow-hidden rounded-xl border border-[#6b3a1f]/18 bg-white/95 shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md",
        !product.in_stock && "opacity-75",
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#f2ead8]">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">
            🍪
          </div>
        )}
        {!product.in_stock ? (
          <span className="absolute inset-x-2 bottom-2 rounded-full bg-black/55 px-2 py-0.5 text-center text-[10px] font-semibold text-white">
            {outOfStockLabel}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-[#2a1505]">
          {product.name}
        </p>
        <p className="text-xs font-bold text-[#5c3317]">{price}</p>
        <span className="mt-auto text-[11px] font-semibold text-[#c9972a] group-hover:underline">
          {viewLabel} →
        </span>
      </div>
    </Link>
  );
}

type MrBrownieChatProductStripProps = {
  products: ChatProductCard[];
  locale: "ar" | "en";
  viewLabel: string;
  outOfStockLabel: string;
  onProductClick?: (product: ChatProductCard) => void;
};

export function MrBrownieChatProductStrip({
  products,
  locale,
  viewLabel,
  outOfStockLabel,
  onProductClick,
}: MrBrownieChatProductStripProps) {
  if (!products.length) return null;

  return (
    <div className="cb-mr-brownie-product-strip -mx-1 flex gap-2.5 overflow-x-auto overscroll-x-contain px-1 pb-1 pt-2">
      {products.map((p) => (
        <MrBrownieChatProductCard
          key={p.id}
          product={p}
          locale={locale}
          viewLabel={viewLabel}
          outOfStockLabel={outOfStockLabel}
          onProductClick={onProductClick}
        />
      ))}
    </div>
  );
}
