import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/sections/section-heading";

export const metadata: Metadata = {
  title: "Returns & refunds",
  description: "Cookie Bite returns, refunds, and quality guarantee policy.",
};

export default function ReturnsPage() {
  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <SectionHeading
          align="left"
          className="text-left"
          eyebrow="Help"
          title="Returns & refunds"
          subtitle="We want every box to feel perfect. Here’s how we handle issues with your order."
        />
        <div className="mt-10 max-w-none text-cb-text">
          <section className="rounded-3xl border border-cb-border bg-cb-surface p-6 shadow-sm">
            <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
              Perishable goods
            </h2>
            <p className="mt-2 leading-relaxed">
              Cookies are perishable. For food safety, we generally cannot accept returns
              once the package has been delivered and opened. If something arrives damaged or
              incorrect, contact us within 24 hours with photos — we’ll make it right.
            </p>
          </section>
          <section className="mt-6 rounded-3xl border border-cb-border bg-cb-surface p-6 shadow-sm">
            <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
              Wrong or missing items
            </h2>
            <p className="mt-2 leading-relaxed">
              If we sent the wrong flavor, size, or missed an item, we’ll replace or refund
              the affected portion after a quick review. Keep the packaging labels if possible.
            </p>
          </section>
          <section className="mt-6 rounded-3xl border border-cb-border bg-cb-surface p-6 shadow-sm">
            <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
              Refund timing
            </h2>
            <p className="mt-2 leading-relaxed">
              Approved refunds for card payments are processed according to your bank’s
              timeline (often 5–10 business days). Cash on delivery adjustments may be
              issued as store credit when applicable.
            </p>
          </section>
        </div>
        <p className="mt-10 text-center text-sm text-cb-text-muted">
          <Link href="/contact" className="font-bold text-cb-terracotta-dark hover:underline">
            Contact customer care
          </Link>
        </p>
      </div>
    </div>
  );
}
