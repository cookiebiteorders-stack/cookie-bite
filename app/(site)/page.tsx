import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { HomeStorySnippet } from "@/components/sections/home-story-snippet";
import { TrustBar } from "@/components/sections/trust-bar";
import { buildLocalizedPageMetadata } from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/", lang);
}

const HeroSection5 = dynamic(
  () =>
    import("@/components/ui/hero-section-5").then((m) => ({
      default: m.HeroSection5,
    })),
  {
    loading: () => (
      <div
        className="min-h-[100svh] w-full bg-cb-cream"
        aria-hidden
      />
    ),
  },
);

const HomeExploreCategories = dynamic(
  () =>
    import("@/components/sections/home-explore-categories").then((m) => ({
      default: m.HomeExploreCategories,
    })),
  { loading: () => <div className="h-96 animate-pulse bg-cb-peach/30" /> },
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
      <HomeProductCarousel />
      <HomeStorySnippet />
      <HomeTestimonials />
      <HomeInstagramGrid />
      <NewsletterBanner />
    </>
  );
}
