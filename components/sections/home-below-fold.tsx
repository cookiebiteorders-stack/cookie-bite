import { HomeExploreCategories } from "@/components/sections/home-explore-categories";
import { HomeContinueShopping } from "@/components/sections/home-continue-shopping";
import { HomeForYouSection } from "@/components/sections/home-for-you-section";
import { HomeProductCarousel } from "@/components/sections/home-product-carousel";
import { HomeStorySnippet } from "@/components/sections/home-story-snippet";
import { HomeTestimonials } from "@/components/sections/home-testimonials";
import { HomeInstagramGrid } from "@/components/sections/home-instagram-grid";
import { NewsletterBanner } from "@/components/sections/newsletter-banner";
import { TrustBar } from "@/components/sections/trust-bar";
import { FaqSection } from "@/components/sections/faq-section";

/** أقسام ما تحت الهيرو — تُحمَّل كوحدة واحدة مؤجّلة من الصفحة الرئيسية. */
export async function HomeBelowFold() {
  return (
    <>
      <TrustBar />
      <HomeExploreCategories />
      <HomeProductCarousel />
      <HomeContinueShopping />
      <HomeForYouSection />
      <HomeStorySnippet />
      <HomeTestimonials />
      <FaqSection />
      <HomeInstagramGrid />
      <NewsletterBanner />
    </>
  );
}
