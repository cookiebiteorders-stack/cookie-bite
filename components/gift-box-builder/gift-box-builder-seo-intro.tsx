import Link from "next/link";
import type { Lang } from "@/lib/i18n/translations";
import { translations } from "@/lib/i18n/translations";

type Props = { lang: Lang };

/** Crawlable intro for the gift box builder — visible to users and search engines. */
export function GiftBoxBuilderSeoIntro({ lang }: Props) {
  const dict = translations[lang];
  const seo = dict.pages.giftBoxBuilderSeo;

  return (
    <section
      className="border-b border-[#F2EAD8] bg-[#FAF6EE] px-6 py-8 sm:px-10"
      aria-labelledby="gift-box-builder-seo-title"
    >
      <div className="mx-auto max-w-3xl space-y-4 text-[#2A1505]">
        <h1 id="gift-box-builder-seo-title" className="font-serif text-2xl font-bold sm:text-3xl">
          {seo.title}
        </h1>
        <p className="text-base leading-relaxed text-[#7A5A3A]">{seo.body}</p>
        <nav aria-label={seo.relatedLinksAria}>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
            <li>
              <Link href="/gift-box" className="text-[#6B3A1F] underline-offset-2 hover:underline">
                {seo.linkGiftBoxes}
              </Link>
            </li>
            <li>
              <Link
                href="/corporate-gifting"
                className="text-[#6B3A1F] underline-offset-2 hover:underline"
              >
                {seo.linkCorporate}
              </Link>
            </li>
            <li>
              <Link href="/help/gifting" className="text-[#6B3A1F] underline-offset-2 hover:underline">
                {seo.linkGiftingHelp}
              </Link>
            </li>
            <li>
              <Link
                href="/delivery/new-cairo"
                className="text-[#6B3A1F] underline-offset-2 hover:underline"
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
