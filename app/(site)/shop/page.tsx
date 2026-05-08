import type { Metadata } from "next";
import { ShopClient } from "@/components/shop/shop-client";

export const metadata: Metadata = {
  title: "Shop",
};

export default function ShopPage() {
  return <ShopClient />;
}
