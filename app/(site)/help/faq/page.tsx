import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/sections/section-heading";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Cookie Bite orders, delivery, and gifting.",
};

const faqs = [
  {
    q: "Where do you deliver?",
    a: `We deliver across New Cairo and surrounding areas from our kitchen in ${BRAND.location}. Contact us for zone-specific timing.`,
  },
  {
    q: "What is the free delivery threshold?",
    a: `Enjoy free delivery on orders over ${BRAND.freeDeliveryThresholdEgp} EGP (before discounts), subject to zone availability.`,
  },
  {
    q: "How fresh are the cookies?",
    a: "We bake in small batches. Most boxes are made to order and packed the same day for delivery.",
  },
  {
    q: "Can I add a gift note?",
    a: "Yes — you can include a handwritten-style note with gift boxes. More customization options are coming at checkout.",
  },
  {
    q: "How do I track my order?",
    a: `After checkout you’ll receive confirmation by email. For quick help, message us on WhatsApp at ${BRAND.phoneDisplay}.`,
  },
];

export default function FaqPage() {
  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <SectionHeading
          align="left"
          className="text-left"
          eyebrow="Help"
          title="Frequently asked questions"
          subtitle="Quick answers about delivery, freshness, and gifting. For anything else, we’re one message away."
        />
        <ul className="mt-10 space-y-6">
          {faqs.map((item) => (
            <li
              key={item.q}
              className="rounded-3xl border border-cb-border bg-cb-surface p-6 shadow-sm"
            >
              <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
                {item.q}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-cb-text">{item.a}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center text-sm text-cb-text-muted">
          Still stuck?{" "}
          <Link href="/contact" className="font-bold text-cb-terracotta-dark hover:underline">
            Contact us
          </Link>
        </p>
      </div>
    </div>
  );
}
