import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Checkout",
  description:
    "Secure Cookie Bite Paymob payment confirmation and order thank-you pages.",
  path: "/checkout",
  keywords: ["cookie bite checkout", "secure payment cookies", "delivery checkout"],
  noIndex: true,
});

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

