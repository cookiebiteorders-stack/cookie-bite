"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { buttonClassName } from "@/components/ui/button";
import { SITE } from "@/lib/data";

/** صور كوكيز — طبقات للعمق ثلاثي الأبعاد */
const COOKIE_LAYERS = [
  {
    src: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=85&w=1400",
    filter:
      "grayscale(0.15) contrast(1.05) brightness(0.55) sepia(0.25) hue-rotate(-8deg)",
    opacity: 1,
    blend: "normal" as const,
  },
  {
    src: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&q=85&w=1400",
    filter:
      "grayscale(0.1) contrast(1.08) brightness(0.72) sepia(0.2) hue-rotate(-5deg)",
    opacity: 0.55,
    blend: "screen" as const,
  },
  {
    src: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=85&w=1400",
    filter:
      "grayscale(0.2) contrast(1.12) brightness(0.65) sepia(0.35) hue-rotate(-12deg)",
    opacity: 0.45,
    blend: "overlay" as const,
  },
];

/**
 * هيرو بتأثير طبقات 3D وبارالكس الفأرة، بألوان Cookie Bite.
 */
export default function HalideTopoHero() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<(HTMLDivElement | null)[]>([]);
  const grainId = useId().replace(/:/g, "");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      canvas.style.opacity = "1";
      canvas.style.transition = "none";
      canvas.style.transform = "rotateX(52deg) rotateZ(-22deg) scale(1)";
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const x = (window.innerWidth / 2 - e.pageX) / 28;
      const y = (window.innerHeight / 2 - e.pageY) / 28;
      canvas.style.transform = `rotateX(${52 + y / 2}deg) rotateZ(${-22 + x / 2}deg)`;
      layersRef.current.forEach((layer, index) => {
        if (!layer) return;
        const depth = (index + 1) * 14;
        const moveX = x * (index + 1) * 0.18;
        const moveY = y * (index + 1) * 0.18;
        layer.style.transform = `translateZ(${depth}px) translate(${moveX}px, ${moveY}px)`;
      });
    };

    canvas.style.opacity = "0";
    canvas.style.transform = "rotateX(88deg) rotateZ(0deg) scale(0.82)";

    const timeout = window.setTimeout(() => {
      canvas.style.transition =
        "opacity 1.2s ease, transform 2.4s cubic-bezier(0.16, 1, 0.3, 1)";
      canvas.style.opacity = "1";
      canvas.style.transform = "rotateX(52deg) rotateZ(-22deg) scale(1)";
    }, 200);

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <section
      className={cn(
        "relative isolate min-h-[100svh] w-full max-w-full overflow-hidden",
        "border-b border-cb-peach-deep/40",
        "bg-gradient-to-b from-[#2a1812] via-[#3e2723] to-[#1c100d]",
      )}
    >
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden>
        <filter id={grainId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves={3}
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>

      <div
        className="pointer-events-none absolute inset-0 z-[5] opacity-[0.11]"
        style={{ filter: `url(#${grainId})` }}
      />

      <div
        className="pointer-events-none absolute inset-0 z-[6] bg-gradient-to-t from-cb-terracotta/20 via-transparent to-cb-cream/[0.07]"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 z-[7] grid grid-cols-2 grid-rows-[auto_1fr_auto] gap-4 p-6 sm:p-10 md:gap-6 md:p-14"
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-cb-peach/90 sm:text-xs">
          {SITE.name.toUpperCase().replace(" ", "_")}
        </div>
        <div className="text-right font-mono text-[10px] text-cb-terracotta sm:text-[11px]">
          <div>NEW_CAIRO · EGYPT</div>
          <div>FRESH_BATCH_DAILY</div>
        </div>

        <h1
          className={cn(
            "col-span-2 self-center justify-self-center text-center font-serif font-semibold leading-[0.88] tracking-tight",
            "text-cb-cream [text-shadow:0_2px_40px_rgba(0,0,0,0.45)]",
            "text-[clamp(2.25rem,9vw,6.5rem)]",
          )}
        >
          Crafted
          <br />
          <span className="text-cb-terracotta">Cookies</span>
        </h1>

        <div className="col-span-2 flex flex-col items-center justify-between gap-6 pb-4 sm:flex-row sm:items-end sm:pb-0">
          <div className="max-w-sm text-center font-mono text-[10px] leading-relaxed text-cb-peach/85 sm:text-left sm:text-[11px]">
            <p>[ SMALL BATCH · REAL BUTTER ]</p>
            <p className="mt-1 text-cb-peach/70">
              Hand-packed boxes — terracotta warmth, zero shortcuts.
            </p>
          </div>
          <Link
            href="/shop"
            className={cn(
              buttonClassName("primary"),
              "pointer-events-auto px-8 py-4 text-sm font-bold uppercase tracking-wide",
            )}
            style={{
              clipPath: "polygon(0 0, 100% 0, 100% 72%, 88% 100%, 0 100%)",
            }}
          >
            Explore flavors
          </Link>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center pt-[26vh] sm:pt-[20vh]"
        style={{ perspective: "2000px" }}
      >
        <div
          ref={canvasRef}
          className="relative h-[min(40vh,400px)] w-[min(92vw,820px)] [transform-style:preserve-3d] sm:h-[min(46vh,500px)]"
        >
          {COOKIE_LAYERS.map((layer, index) => (
            <div
              key={layer.src}
              ref={(el) => {
                layersRef.current[index] = el;
              }}
              className="absolute inset-0 rounded-lg border border-white/10 bg-cover bg-center shadow-2xl"
              style={{
                backgroundImage: `url(${layer.src})`,
                filter: layer.filter,
                opacity: layer.opacity,
                mixBlendMode: layer.blend,
                transition: "transform 0.45s ease",
              }}
            />
          ))}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2"
            style={{
              backgroundImage:
                "repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 38px, rgba(255,255,255,0.04) 39px, transparent 40px)",
              transform: "translateZ(110px)",
            }}
          />
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-8 left-1/2 z-[8] h-14 w-px -translate-x-1/2 bg-gradient-to-b from-cb-terracotta via-cb-peach/50 to-transparent"
        aria-hidden
      />
    </section>
  );
}
