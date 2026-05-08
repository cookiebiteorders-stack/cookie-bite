import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Cake, Briefcase, PartyPopper, Gift, Snowflake } from "lucide-react";
import { GIFT_BOXES, IMAGES } from "@/lib/data";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";
import { buildPageMetadata, buildBreadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Cookie Gift Boxes in New Cairo",
  description:
    "Explore premium Cookie Bite gift boxes for birthdays, corporate gifting, and celebrations in New Cairo.",
  path: "/gift-box",
  keywords: [
    "cookie gift box cairo",
    "birthday cookie gifts",
    "corporate gift box egypt",
    "premium dessert gifts",
  ],
});

const giftCategories = [
  { label: "Birthday Gifts", icon: Cake },
  { label: "Celebrations", icon: PartyPopper },
  { label: "Thank You", icon: Gift },
  { label: "Corporate", icon: Briefcase },
  { label: "Holiday", icon: Snowflake },
];

export default function GiftBoxPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Gift Boxes", path: "/gift-box" },
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <section className="border-b border-cb-peach-deep bg-cb-cream">
        <div className="mx-auto grid max-w-7xl items-center gap-10 cb-gutter py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <h1 className="font-serif text-4xl font-semibold text-cb-text-strong sm:text-5xl">
              Sweet gifts that say it all
            </h1>
            <p className="text-lg text-cb-text">
              Beautiful boxes, handwritten notes, and cookies that feel as
              thoughtful as the moment you’re celebrating.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="#boxes"
                className={buttonClassName("primary", "rounded-full px-8")}
              >
                Explore gift boxes
              </Link>
              <Link
                href="/shop"
                className={buttonClassName("outline", "rounded-full px-8")}
              >
                Build custom gift
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-cb-border">
            <Image
              src={IMAGES.giftBox}
              alt="Cookie gift box"
              fill
              className="object-cover"
              priority
              sizes="(max-width:1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="bg-cb-surface py-14">
        <div className="mx-auto max-w-7xl cb-gutter">
          <SectionHeading
            title="Find the perfect gift"
            subtitle="Start with the occasion — we’ll help you build the rest."
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {giftCategories.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className="flex min-h-[48px] flex-col items-center gap-3 rounded-3xl border border-cb-peach-deep bg-cb-peach/60 p-6 text-center transition hover:-translate-y-1 hover:bg-cb-peach hover:shadow-md"
              >
                <Icon className="h-8 w-8 text-cb-terracotta-dark" aria-hidden />
                <span className="text-sm font-bold text-cb-text-strong">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="boxes" className="bg-cb-cream py-20">
        <div className="mx-auto max-w-7xl cb-gutter">
          <SectionHeading
            eyebrow="Our gift boxes"
            title="Wrapped with intention"
            subtitle="Starting prices shown — customize flavors and notes at checkout."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {GIFT_BOXES.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cb-peach/70 py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 cb-gutter text-center lg:flex-row lg:justify-between lg:text-left">
          <div className="relative h-48 w-full max-w-sm overflow-hidden rounded-3xl shadow-md ring-1 ring-cb-border lg:h-56">
            <Image
              src={IMAGES.heroStack}
              alt="Stacked Cookie Bite gift boxes"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 384px"
            />
          </div>
          <div className="max-w-xl space-y-4">
            <h2 className="font-serif text-3xl font-semibold text-cb-text-strong">
              Corporate & bulk gifting
            </h2>
            <p className="text-cb-text">
              Branded sleeves, scheduled delivery, and dedicated support for
              teams who want to say thank you deliciously.
            </p>
          </div>
          <Link
            href="/contact"
            className={buttonClassName("primary", "whitespace-nowrap rounded-full px-8")}
          >
            Contact for corporate orders
          </Link>
        </div>
      </section>
    </>
  );
}
