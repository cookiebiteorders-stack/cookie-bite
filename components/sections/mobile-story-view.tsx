import Image from "next/image";
import Link from "next/link";
import { Users, Cookie, Truck, Heart } from "lucide-react";
import { STORY_SECTIONS, INSTAGRAM_GRID } from "@/lib/data";

const stats = [
  { icon: Users, num: "10K+", label: "Happy Customers" },
  { icon: Cookie, num: "Fresh", label: "Baked Daily" },
  { icon: Heart, num: "100%", label: "Premium Ingredients" },
  { icon: Truck, num: "Fast", label: "Reliable Delivery" },
];

export function MobileStoryView() {
  return (
    <div className="md:hidden bg-cb-cream min-h-screen">
      {/* Cinematic Hero */}
      <section className="mobile-story-hero">
        <Image
          src="https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80"
          alt="Cookie Bite story"
          fill
          className="mobile-story-hero__img"
          sizes="100vw"
          priority
          fetchPriority="high"
        />
        <div className="mobile-story-hero__overlay" />
        <div className="mobile-story-hero__content">
          <h1 className="text-3xl font-extrabold leading-tight">
            <span className="text-white">A bite of </span>
            <span className="text-[#F0A070]">happiness</span>
          </h1>
          <p className="text-sm text-white/70 mt-2 leading-relaxed">
            We started with a mixer, a dream, and an obsession with the perfect chew. Today, we&apos;re still a small team — just with more ovens.
          </p>
          <Link
            href="/our-cookies"
            className="mobile-btn-outline mobile-btn-pill border-white text-white mt-4 w-fit"
          >
            Explore Our Cookies →
          </Link>
        </div>
      </section>

      <div className="mobile-spacer-lg" />

      {/* Story Sections */}
      {STORY_SECTIONS.map(block => (
        <section key={block.n} className="mobile-story-section">
          <Image
            src={block.image}
            alt={block.title}
            width={800}
            height={440}
            className="mobile-story-section__img"
          />
          <div className="mobile-story-section__num">{block.n}</div>
          <div className="mobile-story-section__body">
            <h2 className="mobile-story-section__h2">{block.title}</h2>
            <p className="mobile-story-section__text">{block.body}</p>
          </div>
        </section>
      ))}

      <div className="mobile-spacer-lg" />

      {/* Stats Grid */}
      <div className="mobile-section">
        <h2 className="mobile-section__h2">Why people love us</h2>
      </div>
      <div className="mobile-spacer-sm" />
      <div className="mobile-stats-grid">
        {stats.map(s => (
          <div key={s.label} className="mobile-stat-cell">
            <s.icon className="mobile-stat-cell__icon" />
            <p className="mobile-stat-cell__num">{s.num}</p>
            <p className="mobile-stat-cell__label">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mobile-spacer-lg" />

      {/* Photo Moments */}
      <div className="mobile-section">
        <h2 className="mobile-section__h2">Moments we create</h2>
      </div>
      <div className="mobile-spacer-sm" />
      <div className="mobile-moments-grid">
        <Image src={INSTAGRAM_GRID[0]} alt="" width={800} height={360} className="mobile-moments-grid__full" />
        <div className="mobile-moments-grid__pair">
          <Image src={INSTAGRAM_GRID[1]} alt="" width={400} height={280} className="mobile-moments-grid__half" />
          <Image src={INSTAGRAM_GRID[2]} alt="" width={400} height={280} className="mobile-moments-grid__half" />
        </div>
        <Image src={INSTAGRAM_GRID[3]} alt="" width={800} height={360} className="mobile-moments-grid__full" />
      </div>

      <div className="mobile-spacer-lg" />

      {/* CTA */}
      <div className="text-center px-4">
        <h2 className="text-[22px] font-bold text-cb-text-strong mb-2">
          Ready to taste our story?
        </h2>
        <p className="text-sm text-cb-text-muted mb-4">
          Discover the cookies everyone&apos;s talking about.
        </p>
        <div className="flex gap-2.5 justify-center">
          <Link href="/shop" className="mobile-btn-primary mobile-btn-pill">Shop now</Link>
          <Link href="/gift-box/build" className="mobile-btn-outline mobile-btn-pill">Build your gift box</Link>
        </div>
      </div>

      <div className="mobile-spacer-lg" />
    </div>
  );
}
