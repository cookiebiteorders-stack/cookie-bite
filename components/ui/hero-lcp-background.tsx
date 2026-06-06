import Image from "next/image";
import { HERO_FALLBACK_IMAGE, HERO_VIDEO_SRC } from "@/lib/site-media";

/** خلفية الهيرو — Server Component لتحسين LCP (تُرسَل في HTML بدون انتظار JS). */
export function HeroLcpBackground() {
  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden bg-[var(--color-cream)]"
      aria-hidden
    >
      {HERO_VIDEO_SRC ? (
        <video
          muted
          playsInline
          autoPlay
          loop
          preload="metadata"
          poster={HERO_FALLBACK_IMAGE}
          className="absolute inset-0 h-full w-full object-cover"
          src={HERO_VIDEO_SRC}
        />
      ) : (
        <Image
          src={HERO_FALLBACK_IMAGE}
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          quality={72}
          className="object-cover"
        />
      )}
      <div className="pointer-events-none absolute inset-0 cb-pl-hero-overlay lg:hidden" />
      <div className="pointer-events-none absolute inset-0 cb-pl-hero-overlay hidden lg:block" />
    </div>
  );
}
