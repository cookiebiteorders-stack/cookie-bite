import type { Metadata } from "next";
import Link from "next/link";
import { MobileGiftView } from "@/components/sections/mobile-gift-view";
import { buttonClassName } from "@/components/ui/button";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Gift Ideas",
  description:
    "Find the perfect cookie gift box for any occasion — birthdays, celebrations, corporate events, and more from Cookie Bite.",
  path: "/gift-ideas",
  keywords: ["cookie gift box cairo", "cookie gifts egypt", "corporate cookie gifts"],
});

export default function GiftIdeasPage() {
  return (
    <div className="bg-cb-cream pb-20 pt-10">
      <div className="mx-auto max-w-7xl cb-gutter text-center space-y-6">
        <h1 className="font-serif text-4xl font-semibold text-cb-text-strong">
          Sweet gifts that say it all
        </h1>
        <p className="text-lg text-cb-text max-w-2xl mx-auto">
          Explore our curated gift boxes for every occasion — from birthdays to corporate events.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/gift-box" className={buttonClassName("primary", "px-8")}>
            Explore Gift Boxes
          </Link>
          <Link href="/contact" className={buttonClassName("outline", "px-8")}>
            Corporate Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
