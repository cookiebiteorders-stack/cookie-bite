import type { Metadata } from "next";
import { ContactPageBody } from "@/components/pages/contact-page-body";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com";

export const metadata: Metadata = {
  title: "Contact Cookie Bite New Cairo",
  description:
    "Contact Cookie Bite for custom cookie orders, gifting support, wholesale, and delivery help in New Cairo.",
  keywords: [
    "contact cookie bite",
    "cookie bite support",
    "cookie delivery support cairo",
    "custom cookie order egypt",
  ],
  alternates: { canonical: "/contact" },
  openGraph: {
    url: `${APP_URL}/contact`,
    title: "Contact Cookie Bite | Orders, Gifting & Support",
    description:
      "Need help with an order or custom cookie gift? Contact Cookie Bite support in New Cairo.",
    images: [{ url: `${APP_URL}/images/web-logo.png`, width: 1200, height: 630 }],
  },
};

export default function ContactPage() {
  return <ContactPageBody />;
}
