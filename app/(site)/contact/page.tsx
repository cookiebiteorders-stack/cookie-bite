import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";
import { SectionHeading } from "@/components/sections/section-heading";
import { BRAND } from "@/lib/brand";

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
  const phoneHref = `+${BRAND.whatsappE164}`;

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
                href={`mailto:${BRAND.ordersEmail}`}
                className="hover:text-cb-terracotta-dark hover:underline"
              >
                {BRAND.ordersEmail}
              </a>
            </li>
            <li>
              <a
                href={`tel:${phoneHref}`}
                className="hover:text-cb-terracotta-dark hover:underline"
              >
                {BRAND.phoneDisplay}
              </a>
            </li>
            <li>{BRAND.location}</li>
          </ul>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
