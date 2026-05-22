import dynamic from "next/dynamic";
import { ExploreCategories } from "@/components/sections/explore-categories";
import { HomeStorySnippet } from "@/components/sections/home-story-snippet";
import { TrustBar } from "@/components/sections/trust-bar";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Cookie Delivery & Gift Boxes in New Cairo",
  description:
    "Order handcrafted cookies and premium gift boxes in New Cairo. Explore bestselling flavors, seasonal treats, and same-day support from Cookie Bite.",
  path: "/",
  keywords: [
    "cookie delivery new cairo",
    "order cookies online egypt",
    "cookie gift box cairo",
    "fresh baked cookies",
    "cookie bite cairo",
  ],
});

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
      <p className="sr-only">
        Cookie Bite delivers fresh handcrafted cookies and premium gift boxes across New Cairo and
        surrounding areas in Egypt. Order online for birthdays, corporate gifting, and everyday
        treats.
      </p>
      <HeroSection5 />
      <TrustBar />
      <ExploreCategories />
      <ProductCarousel />
      <HomeStorySnippet />
      <TestimonialSlider />
      <InstagramGrid />
      <NewsletterBanner />
    </>
  );
}
