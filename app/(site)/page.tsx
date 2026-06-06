import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { HeroSection5 } from "@/components/ui/hero-section-5";
import { buildLocalizedPageMetadata } from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/", lang);
}

const HomeBelowFold = dynamic(
  () =>
    import("@/components/sections/home-below-fold").then((m) => ({
      default: m.HomeBelowFold,
    })),
  {
    loading: () => (
      <div className="space-y-6 pb-16" aria-hidden>
        <div className="h-14 animate-pulse bg-cb-peach/25" />
        <div className="h-96 animate-pulse bg-cb-peach/30" />
        <div className="h-40 animate-pulse bg-cb-peach/30" />
      </div>
    ),
  },
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
      <HomeBelowFold />
    </>
  );
}
