import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { getCsrfTokenForClient } from "@/lib/security/csrf";
import CheckoutClient from "./checkout-client";

export const metadata: Metadata = buildPageMetadata({
  title: "Checkout",
  description:
    "Secure Cookie Bite Paymob payment confirmation and order thank-you pages.",
  path: "/checkout",
  keywords: ["cookie bite checkout", "secure payment cookies", "delivery checkout"],
  noIndex: true,
});

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const csrfData = await getCsrfTokenForClient();
  return <CheckoutClient csrfToken={csrfData.token}>{children}</CheckoutClient>;
}

