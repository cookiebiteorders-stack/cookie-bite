import Link from "next/link";
import type { Lang } from "@/lib/i18n/translations";
import { getGiftBoxBuilderSeoCopy } from "@/lib/i18n/gift-box-builder-seo-copy";

type Props = { lang: Lang };

/** Page hero for the gift box builder — matches storefront typography and colors. */
export function GiftBoxBuilderSeoIntro({ lang }: Props) {
  const seo = getGiftBoxBuilderSeoCopy(lang);

  return (
    <section
      className="border-b border-cb-border bg-cb-cream"
      aria-labelledby="gift-box-builder-seo-title"
    >
      <div className="mx-auto max-w-7xl space-y-4 cb-gutter py-10 sm:py-12">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cb-terracotta-dark">
          {lang === "ar" ? "صندوق هدية مخصص" : "Custom Gift Box"}
        </p>
        <h1
          id="gift-box-builder-seo-title"
          className="font-serif text-3xl font-semibold text-cb-text-strong sm:text-4xl"
        >
          {seo.title}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-cb-text">{seo.body}</p>
        <nav aria-label={seo.relatedLinksAria}>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
            <li>
              <Link href="/gift-box" className="text-cb-terracotta-dark underline-offset-2 hover:underline">
                {seo.linkGiftBoxes}
              </Link>
            </li>
            <li>
              <Link
                href="/corporate-gifting"
                className="text-cb-terracotta-dark underline-offset-2 hover:underline"
              >
                {seo.linkCorporate}
              </Link>
            </li>
            <li>
              <Link href="/help/gifting" className="text-cb-terracotta-dark underline-offset-2 hover:underline">
                {seo.linkGiftingHelp}
              </Link>
            </li>
            <li>
              <Link
                href="/delivery/new-cairo"
                className="text-cb-terracotta-dark underline-offset-2 hover:underline"
              >
                {seo.linkDelivery}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </section>
  );
}
