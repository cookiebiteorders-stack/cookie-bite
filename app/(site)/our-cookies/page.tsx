import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Cookie, Heart, Leaf, Sparkles, Star } from "lucide-react";
import { OUR_COOKIE_SECTIONS } from "@/lib/data";
import { OurCookiesTestimonials } from "@/components/our-cookies/our-cookies-testimonials";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Our Cookies",
};

const iconMap = {
  cookie: Cookie,
  heart: Heart,
  sparkles: Sparkles,
  star: Star,
  leaf: Leaf,
} as const;

export default function OurCookiesPage() {
  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-7xl cb-gutter">
        <SectionHeading
          eyebrow="Our menu"
          title="Discover our flavors"
          subtitle="Each collection is baked with its own personality — from everyday classics to indulgent specials."
        />

        <div className="space-y-20">
          {OUR_COOKIE_SECTIONS.map((section) => {
            const Icon = iconMap[section.icon];
            return (
              <section
                key={section.id}
                id={section.id}
                className="grid gap-10 lg:grid-cols-12 lg:gap-12"
              >
                <div className="lg:col-span-3">
                  <div className="sticky top-28 space-y-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cb-peach text-cb-terracotta-dark ring-1 ring-cb-peach-deep">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <h2 className="font-serif text-3xl font-semibold text-cb-text-strong">
                      {section.title}
                    </h2>
                    <p className="text-cb-text">{section.description}</p>
                    <Link
                      href="/shop"
                      className={buttonClassName(
                        "outline",
                        "inline-flex w-fit px-6",
                      )}
                    >
                      Shop {section.title}
                    </Link>
                  </div>
                </div>
                <div className="lg:col-span-9">
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col items-center rounded-3xl bg-cb-surface p-6 text-center shadow-sm ring-1 ring-cb-border"
                      >
                        <div className="relative mb-4 h-40 w-40 overflow-hidden rounded-full bg-cb-peach/60 ring-1 ring-cb-peach-deep">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="160px"
                          />
                        </div>
                        <h3 className="font-serif text-lg font-semibold text-cb-text-strong">
                          {item.name}
                        </h3>
                        <p className="mt-2 text-sm font-bold text-cb-terracotta-dark">
                          {item.price} EGP
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <OurCookiesTestimonials />
    </div>
  );
}
