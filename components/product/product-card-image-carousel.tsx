"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductSharedImage } from "@/components/product/product-shared-image";
import { useLanguage } from "@/components/providers/language-provider";
import { PRODUCT_PLACEHOLDER_IMAGE } from "@/lib/products/media";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  productName: string;
  images: string[];
  sizes?: string;
  sharedLayout?: boolean;
  onImageClick?: () => void;
  className?: string;
};

function uniqueGalleryUrls(images: string[], fallback: string): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const raw of images) {
    const url = raw?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    list.push(url);
  }
  if (list.length === 0 && fallback.trim()) list.push(fallback.trim());
  return list;
}

export function ProductCardImageCarousel({
  productId,
  productName,
  images,
  sizes = "(max-width:768px) 50vw, 25vw",
  sharedLayout = false,
  onImageClick,
  className,
}: Props) {
  const { t } = useLanguage();
  const slides = useMemo(
    () => uniqueGalleryUrls(images, PRODUCT_PLACEHOLDER_IMAGE),
    [images],
  );
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const hasMany = slides.length > 1;
  const activeIndex = hasMany ? index % slides.length : 0;
  const activeUrl = slides[activeIndex] ?? PRODUCT_PLACEHOLDER_IMAGE;
  const isPlaceholder = activeUrl === PRODUCT_PLACEHOLDER_IMAGE;

  const go = useCallback(
    (delta: number) => {
      if (!hasMany) return;
      setIndex((i) => (i + delta + slides.length) % slides.length);
    },
    [hasMany, slides.length],
  );

  const stopNav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={cn("relative h-full w-full", className)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null || !hasMany) return;
        const endX = e.changedTouches[0]?.clientX;
        if (endX == null) return;
        const delta = endX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < 36) return;
        go(delta > 0 ? -1 : 1);
      }}
    >
      <button
        type="button"
        className="absolute inset-0 block w-full cursor-zoom-in text-start"
        onClick={onImageClick}
        aria-label={onImageClick ? t("search.quickView") : productName}
      >
        {activeIndex === 0 ? (
          <ProductSharedImage
            productId={productId}
            src={activeUrl}
            alt={productName}
            sizes={sizes}
            sharedLayout={sharedLayout}
            imgClassName={cn(
              "transition-opacity duration-300",
              isPlaceholder && "object-contain p-3",
            )}
          />
        ) : (
          <Image
            src={activeUrl}
            alt={productName}
            fill
            sizes={sizes}
            loading="lazy"
            decoding="async"
            className={cn(
              "object-cover transition-opacity duration-300",
              isPlaceholder && "object-contain p-3",
            )}
          />
        )}
      </button>

      {hasMany ? (
        <>
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {slides.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={(e) => {
                  stopNav(e);
                  setIndex(i);
                }}
                className={cn(
                  "h-1.5 rounded-full bg-white/90 shadow-sm transition-all duration-200",
                  i === activeIndex ? "w-5" : "w-1.5 bg-white/55",
                )}
                aria-label={t("product.gallerySlide", {
                  current: String(i + 1),
                  total: String(slides.length),
                })}
                aria-current={i === activeIndex}
              />
            ))}
          </div>

          <span className="pointer-events-none absolute end-3 bottom-3 z-20 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white backdrop-blur-sm">
            {activeIndex + 1}/{slides.length}
          </span>

          <button
            type="button"
            onClick={(e) => {
              stopNav(e);
              go(-1);
            }}
            className="absolute start-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 p-1.5 text-white opacity-100 backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={t("product.galleryPrev")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => {
              stopNav(e);
              go(1);
            }}
            className="absolute end-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 p-1.5 text-white opacity-100 backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={t("product.galleryNext")}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}
