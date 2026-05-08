import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { STORY_SECTIONS } from "@/lib/data";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Our Story",
};

const stats = [
  { title: "10K+ happy customers", body: "Across Cairo and beyond." },
  { title: "Small batches", body: "Never mass-produced, always watched." },
  { title: "Real ingredients", body: "Butter, chocolate, and time." },
  { title: "Gift-ready", body: "Ribbons, notes, and care in every box." },
];

export default function OurStoryPage() {
  return (
    <div className="bg-cb-cream">
      <section className="border-b border-cb-peach-deep">
        <div className="mx-auto grid max-w-7xl items-center gap-12 cb-gutter py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <h1 className="font-serif text-4xl font-semibold text-cb-text-strong sm:text-5xl lg:text-6xl">
              A bite of happiness
            </h1>
            <p className="text-lg text-cb-text">
              We started with a mixer, a dream, and an obsession with the perfect
              chew. Today, we’re still a small team — just with more ovens and
              more love to give.
            </p>
            <Link href="/shop" className={buttonClassName("primary", "w-fit px-8")}>
              Explore our cookies →
            </Link>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-xl">
            <Image
              src="https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80"
              alt="كوكيز مربوطة بشريط هدايا"
              fill
              className="object-cover"
              sizes="(max-width:1024px) 100vw, 50vw"
              priority
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-24 cb-gutter py-20">
        {STORY_SECTIONS.map((block) => (
          <section
            key={block.n}
            className="grid gap-10 lg:grid-cols-2 lg:items-center"
          >
            <div className={block.reverse ? "lg:order-2" : ""}>
              <p className="text-sm font-bold text-cb-terracotta-dark">{block.n}</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-cb-text-strong">
                {block.title}
              </h2>
              <p className="mt-4 text-lg text-cb-text">{block.body}</p>
            </div>
            <div
              className={`relative aspect-[4/3] overflow-hidden rounded-3xl shadow-lg ring-1 ring-cb-border ${
                block.reverse ? "lg:order-1" : ""
              }`}
            >
              <Image
                src={block.image}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
            </div>
          </section>
        ))}
      </div>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl cb-gutter">
          <SectionHeading title="Why people love us" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.title}
                className="rounded-3xl border border-cb-border bg-cb-cream p-6"
              >
                <h3 className="font-semibold text-cb-text-strong">{s.title}</h3>
                <p className="mt-2 text-sm text-cb-text">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cb-peach/50 py-16 text-center">
        <div className="mx-auto max-w-2xl space-y-6 px-4">
          <h2 className="font-serif text-3xl font-semibold text-cb-text-strong">
            Ready to taste our story?
          </h2>
          <p className="text-cb-text">
            Discover the cookies everyone’s talking about — or build a box that
            feels unmistakably yours.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/shop" className={buttonClassName("primary", "px-8")}>
              Shop now
            </Link>
            <Link href="/gift-box" className={buttonClassName("outline", "px-8")}>
              Build your box
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
