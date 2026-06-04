"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { PRODUCT_PLACEHOLDER_IMAGE } from "@/lib/products/media";
import { cn } from "@/lib/utils";

export type PdpGallerySlide =
  | { type: "image"; url: string }
  | { type: "video"; url: string };

type Props = {
  productId: string;
  productName: string;
  images: string[];
  videoUrl?: string | null;
  sizes?: string;
};

export function PdpMediaGallery({
  productId,
  productName,
  images,
  videoUrl,
  sizes = "(max-width:1024px) 100vw, 50vw",
}: Props) {
  const slides = useMemo<PdpGallerySlide[]>(() => {
    const list: PdpGallerySlide[] = [];
    const video = videoUrl?.trim();
    if (video) list.push({ type: "video", url: video });
    const seen = new Set<string>();
    for (const url of images) {
      const u = url?.trim();
      if (!u || seen.has(u)) continue;
      seen.add(u);
      list.push({ type: "image", url: u });
    }
    if (list.length === 0) {
      list.push({ type: "image", url: PRODUCT_PLACEHOLDER_IMAGE });
    }
    return list;
  }, [images, videoUrl]);

  const [index, setIndex] = useState(0);
  const active = slides[index] ?? slides[0];
  const hasMany = slides.length > 1;

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + slides.length) % slides.length);
    },
    [slides.length],
  );

  return (
    <div className="space-y-3" data-product-gallery={productId}>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-cb-peach/40 shadow-lg ring-1 ring-cb-border lg:aspect-[4/5]">
        {active.type === "video" ? (
          <video
            key={active.url}
            src={active.url}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
            aria-label={`${productName} video`}
          />
        ) : (
          <Image
            src={active.url}
            alt={productName}
            fill
            priority={index === 0}
            className="object-cover"
            sizes={sizes}
          />
        )}

        {hasMany ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Next slide"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {slides.map((slide, i) => (
                <button
                  key={`${slide.type}-${slide.url}-${i}`}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-2 w-2 rounded-full transition",
                    i === index ? "bg-white w-6" : "bg-white/50 hover:bg-white/80",
                  )}
                  aria-label={`Slide ${i + 1}`}
                  aria-current={i === index}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {hasMany ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {slides.map((slide, i) => (
            <button
              key={`thumb-${slide.type}-${slide.url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition",
                i === index
                  ? "border-cb-terracotta-dark ring-2 ring-cb-terracotta-dark/30"
                  : "border-cb-border opacity-80 hover:opacity-100",
              )}
            >
              {slide.type === "video" ? (
                <span className="flex h-full w-full items-center justify-center bg-cb-surface-2 text-cb-terracotta-dark">
                  <Play className="h-5 w-5" aria-hidden />
                </span>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={slide.url} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
