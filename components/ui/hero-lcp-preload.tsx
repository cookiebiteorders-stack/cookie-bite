import { HERO_LCP_SOURCES } from "@/lib/site-media";

/** روابط preload متجاوبة لصورة الهيرو — تطابق `<picture>` في HeroLcpBackground. */
export function HeroLcpPreload() {
  return (
    <>
      <link
        rel="preload"
        as="image"
        href={HERO_LCP_SOURCES.mobile}
        media="(max-width: 640px)"
        fetchPriority="high"
        type="image/webp"
      />
      <link
        rel="preload"
        as="image"
        href={HERO_LCP_SOURCES.desktop}
        media="(min-width: 641px)"
        fetchPriority="high"
        type="image/webp"
      />
    </>
  );
}
