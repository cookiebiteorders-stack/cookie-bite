import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Cart",
  description:
    "Review selected Cookie Bite products, update quantities, and continue to secure checkout.",
  path: "/cart",
  keywords: ["cookie bite cart", "review cookie order", "shopping cart"],
  noIndex: true,
});

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}

