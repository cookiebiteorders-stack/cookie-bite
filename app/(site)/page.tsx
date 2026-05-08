import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { ExploreCategories } from "@/components/sections/explore-categories";
import { HomeStorySnippet } from "@/components/sections/home-story-snippet";
import { TrustBar } from "@/components/sections/trust-bar";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com";

export const metadata: Metadata = {
  title: "Cookie Delivery New Cairo | Cookie Bite",
  description:
    "Order handcrafted cookies and premium gift boxes in New Cairo. Explore bestselling flavors, seasonal treats, and same-day support.",
  keywords: [
    "cookie delivery new cairo",
    "order cookies online egypt",
    "cookie gift box cairo",
    "fresh baked cookies",
    "cookie bite cairo",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    url: APP_URL,
    title: "Cookie Bite | Cookie Delivery & Gift Boxes in New Cairo",
    description:
      "Shop handcrafted cookies, seasonal flavors, and premium gift boxes delivered in New Cairo.",
    images: [{ url: `${APP_URL}/images/web-logo.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cookie Bite | Fresh Cookies in New Cairo",
    description:
      "Explore handcrafted cookies and gift boxes from Cookie Bite in New Cairo.",
    images: [`${APP_URL}/images/web-logo.png`],
  },
};

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

const ProductCarousel = dynamic(
  () =>
    import("@/components/sections/product-carousel").then((m) => m.ProductCarousel),
  { loading: () => <div className="h-40 animate-pulse bg-cb-peach/30" /> },
);

const TestimonialSlider = dynamic(
  () =>
    import("@/components/sections/testimonial-slider").then(
      (m) => m.TestimonialSlider,
    ),
  { loading: () => <div className="h-64 animate-pulse bg-cb-peach/30" /> },
);

const InstagramGrid = dynamic(
  () =>
    import("@/components/sections/instagram-grid").then((m) => m.InstagramGrid),
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
      <HeroSection5 />
      <TrustBar />
      <ExploreCategories />
      <HomeStorySnippet />
      <ProductCarousel />
      <TestimonialSlider />
      <InstagramGrid />
      <NewsletterBanner />
    </>
  );
}
