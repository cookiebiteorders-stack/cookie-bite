import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";
import { SectionHeading } from "@/components/sections/section-heading";

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
  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto grid max-w-7xl gap-12 cb-gutter lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            className="text-left"
            eyebrow="Contact"
            title="We’d love to hear from you"
            subtitle="Questions about gifting, wholesale, or a custom order? Send a note — our team replies within one business day."
          />
          <ul className="mt-8 space-y-3 text-cb-text font-medium">
            <li>
              <a
                href="mailto:hello@cookie-bite.com"
                className="hover:text-cb-terracotta-dark hover:underline"
              >
                hello@cookie-bite.com
              </a>
            </li>
            <li>
              <a
                href="tel:+201000000000"
                className="hover:text-cb-terracotta-dark hover:underline"
              >
                +20 100 000 0000
              </a>
            </li>
            <li>New Cairo, Egypt</li>
          </ul>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
