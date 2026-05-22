import Link from "next/link";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { BRAND } from "@/lib/brand";
import { DELIVERY_AREAS, DELIVERY_AREAS_FAQ } from "@/lib/content/local-pages";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Cookie Delivery Areas & Compounds",
  description:
    "See popular New Cairo delivery areas for Cookie Bite cookies and gift boxes. Confirm your compound on WhatsApp before checkout.",
  path: "/delivery/areas",
  keywords: [
    "cookie delivery compounds cairo",
    "fifth settlement cookie delivery",
    "mivida dessert delivery",
  ],
});

export default function DeliveryAreasPage() {
  const faqJsonLd = buildFaqPageJsonLd([...DELIVERY_AREAS_FAQ]);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Delivery areas", path: "/delivery/areas" },
  ]);

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <JsonLdScript id="delivery-areas-faq" json={faqJsonLd} />
      <JsonLdScript id="delivery-areas-breadcrumb" json={breadcrumbJsonLd} />
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <SectionHeading
          align="left"
          className="text-left"
          eyebrow="Delivery"
          title="Delivery areas we frequently serve"
          subtitle="Popular compounds and neighborhoods — list updated regularly. Always confirm on WhatsApp."
        />

        <p className="mt-6 text-sm leading-relaxed text-cb-text">
          Send your compound name to WhatsApp {BRAND.phoneDisplay} before large orders. We confirm
          timing and fees for your zone.
        </p>

        <ul className="mt-8 grid gap-2 sm:grid-cols-2">
          {DELIVERY_AREAS.map((area) => (
            <li
              key={area}
              className="rounded-xl border border-cb-border bg-cb-surface px-4 py-3 text-sm font-medium text-cb-text"
            >
              {area}
            </li>
          ))}
        </ul>

        <section className="mt-12">
          <h2 className="font-serif text-xl font-semibold text-cb-text-strong">FAQ</h2>
          <ul className="mt-6 space-y-4">
            {DELIVERY_AREAS_FAQ.map((item) => (
              <li key={item.q} className="rounded-2xl border border-cb-border bg-cb-surface p-5">
                <h3 className="font-semibold text-cb-text-strong">{item.q}</h3>
                <p className="mt-2 text-sm text-cb-text">{item.a}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-center text-sm text-cb-text-muted">
          Don&apos;t see your area?{" "}
          <Link href="/contact" className="font-bold text-cb-terracotta-dark underline">
            Contact us
          </Link>
        </p>

        <Link
          href="/delivery/new-cairo"
          className={buttonClassName("primary", "mt-10 inline-flex rounded-full px-8")}
        >
          New Cairo delivery guide
        </Link>
      </div>
    </div>
  );
}
