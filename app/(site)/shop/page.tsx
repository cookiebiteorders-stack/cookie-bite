import type { Metadata } from "next";
import { ShopClient } from "@/components/shop/shop-client";
import { MobileShopView } from "@/components/shop/mobile-shop-view";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com";

export const metadata: Metadata = {
  title: "Shop Cookies in New Cairo",
  description:
    "Browse Cookie Bite flavors, compare prices, and order fresh handcrafted cookies online in New Cairo.",
  keywords: [
    "shop cookies cairo",
    "buy cookies online egypt",
    "new cairo bakery shop",
    "cookie bite flavors",
  ],
  alternates: { canonical: "/shop" },
  openGraph: {
    url: `${APP_URL}/shop`,
    title: "Shop Cookies in New Cairo | Cookie Bite",
    description:
      "Browse handcrafted cookies and order your favorite flavors online.",
    images: [{ url: `${APP_URL}/images/web-logo.png`, width: 1200, height: 630 }],
  },
};

export default function ShopPage() {
  return <ShopClient />;
}
