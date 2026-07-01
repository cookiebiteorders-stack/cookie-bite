import { HERO_FALLBACK_IMAGE, HERO_LCP_SOURCES, HERO_VIDEO_SRC } from "@/lib/site-media";

/** خلفية الهيرو — Server Component؛ ملفات ثابتة مضغوطة مسبقاً (أسرع LCP من `/_next/image`). */
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
        <picture>
          <source
            media="(max-width: 640px)"
            srcSet={HERO_LCP_SOURCES.mobile}
            type="image/webp"
          />
          <img
            src={HERO_LCP_SOURCES.desktop}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      )}
      <div className="pointer-events-none absolute inset-0 cb-pl-hero-overlay cb-pl-hero-overlay--mobile lg:hidden" />
      <div className="pointer-events-none absolute inset-0 cb-pl-hero-overlay cb-pl-hero-overlay--desktop hidden lg:block" />
    </div>
  );
}
