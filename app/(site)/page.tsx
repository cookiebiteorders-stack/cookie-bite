import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { preload } from "react-dom";
import { HeroSection5 } from "@/components/ui/hero-section-5";
import { HomeStorySnippet } from "@/components/sections/home-story-snippet";
import { TrustBar } from "@/components/sections/trust-bar";
import { buildLocalizedPageMetadata } from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";
import { HERO_FALLBACK_IMAGE } from "@/lib/site-media";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/", lang);
}

const HomeExploreCategories = dynamic(
  () =>
    import("@/components/sections/home-explore-categories").then((m) => ({
      default: m.HomeExploreCategories,
    })),
  { loading: () => <div className="h-96 animate-pulse bg-cb-peach/30" /> },
);

const HomeContinueShopping = dynamic(
  () =>
    import("@/components/sections/home-continue-shopping").then((m) => ({
      default: m.HomeContinueShopping,
    })),
  { loading: () => null },
);

const HomeForYouSection = dynamic(
  () =>
    import("@/components/sections/home-for-you-section").then((m) => ({
      default: m.HomeForYouSection,
    })),
  { loading: () => null },
);

const HomeProductCarousel = dynamic(
  () =>
    import("@/components/sections/home-product-carousel").then((m) => ({
      default: m.HomeProductCarousel,
    })),
  { loading: () => <div className="h-40 animate-pulse bg-cb-peach/30" /> },
);

const HomeTestimonials = dynamic(
  () =>
    import("@/components/sections/home-testimonials").then((m) => m.HomeTestimonials),
  { loading: () => <div className="h-64 animate-pulse bg-cb-peach/30" /> },
);

const HomeInstagramGrid = dynamic(
  () =>
    import("@/components/sections/home-instagram-grid").then((m) => m.HomeInstagramGrid),
  { loading: () => <div className="h-48 animate-pulse bg-cb-peach/30" /> },
);

const NewsletterBanner = dynamic(
  () =>
    import("@/components/sections/newsletter-banner").then(
      (m) => m.NewsletterBanner,
    ),
  { loading: () => <div className="h-32 animate-pulse bg-cb-peach/30" /> },
);

export default function HomePage() {
  preload(HERO_FALLBACK_IMAGE, { as: "image", fetchPriority: "high" });

  return (
    <>
      <p className="sr-only">
        Cookie Bite delivers fresh handcrafted cookies and premium gift boxes across New Cairo and
        surrounding areas in Egypt. Order online for birthdays, corporate gifting, and everyday
        treats.
      </p>
      <HeroSection5 />
      <TrustBar />
      <HomeExploreCategories />
      <HomeContinueShopping />
      <HomeForYouSection />
      <HomeProductCarousel />
      <HomeStorySnippet />
      <HomeTestimonials />
      <HomeInstagramGrid />
      <NewsletterBanner />
    </>
  );
}
