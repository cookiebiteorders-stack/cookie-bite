import type { Metadata } from "next";
import { GiftIdeasClient } from "@/components/pages/gift-ideas-client";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Gift Ideas",
  description:
    "Find the perfect cookie gift box for any occasion — birthdays, celebrations, corporate events, and more from Cookie Bite.",
  path: "/gift-ideas",
  keywords: ["cookie gift box cairo", "cookie gifts egypt", "corporate cookie gifts"],
});

export default function GiftIdeasPage() {
  return <GiftIdeasClient />;
}
