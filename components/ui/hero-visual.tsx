"use client";

import Image from "next/image";
import { Sparkles, Star } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { HERO_FALLBACK_IMAGE } from "@/lib/site-media";

const TRUST_PILL_KEYS = ["hero.trust0", "hero.trust1", "hero.trust5"] as const;

/** صورة المنتج + شارات عائمة — يملأ العمود الفارغ ويُظهر الخبز. */
export function HeroVisual() {
  const { t } = useLanguage();

  return (
    <div className="cb-hero-visual" aria-hidden={false}>
      <div className="cb-hero-visual__glow" aria-hidden />
      <div className="cb-hero-visual__ring cb-hero-visual__ring--outer" aria-hidden />
      <div className="cb-hero-visual__ring cb-hero-visual__ring--inner" aria-hidden />

      <div className="cb-hero-visual__frame">
        <Image
          src={HERO_FALLBACK_IMAGE}
          alt=""
          width={560}
          height={560}
          sizes="(max-width: 1023px) min(72vw, 20rem), min(42vw, 28rem)"
          className="cb-hero-visual__img"
          loading="lazy"
        />
      </div>

      <div className="cb-hero-visual__badge cb-hero-visual__badge--rating">
        <span className="cb-hero-visual__stars" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-[var(--color-soft-gold)] text-[var(--color-soft-gold)]" />
          ))}
        </span>
        <span className="cb-hero-visual__badge-text">{t("hero.trust6")}</span>
      </div>

      <div className="cb-hero-visual__badge cb-hero-visual__badge--fresh">
        <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-caramel)]" aria-hidden />
        <span className="cb-hero-visual__badge-text">{t("hero.trust5")}</span>
      </div>

      <Image
        src="/brand/mr-brownie-mascot.png"
        alt=""
        width={72}
        height={72}
        className="cb-hero-visual__mascot"
      />
    </div>
  );
}

export function HeroTrustPills() {
  const { t } = useLanguage();

  return (
    <ul className="cb-hero-trust-pills" aria-label={t("hero.proofTitle")}>
      {TRUST_PILL_KEYS.map((key) => (
        <li key={key} className="cb-hero-trust-pills__item">
          {t(key)}
        </li>
      ))}
    </ul>
  );
}
