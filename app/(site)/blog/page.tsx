import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";
import { ShareButtons } from "@/components/seo/share-buttons";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com";

export const metadata: Metadata = {
  title: "Cookie Blog: New Cairo Dessert Tips & Gift Ideas",
  description:
    "Read Cookie Bite blog guides on cookie gifting, dessert trends, and celebration ideas in New Cairo. Find practical tips and inspiration.",
  keywords: [
    "cookie blog cairo",
    "dessert tips egypt",
    "gift box ideas cairo",
    "cookie delivery guide",
    "new cairo bakery blog",
  ],
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: `${APP_URL}/blog`,
    title: "Cookie Blog: Dessert Tips & Gift Ideas | Cookie Bite",
    description:
      "Explore practical cookie guides, gift ideas, and behind-the-scenes stories from Cookie Bite.",
    images: [{ url: `${APP_URL}/images/web-logo.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cookie Bite Blog: Dessert Tips & Gift Ideas",
    description:
      "Discover practical dessert guides and cookie gifting ideas in New Cairo.",
    images: [`${APP_URL}/images/web-logo.png`],
  },
};

export default function BlogIndexPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What does Cookie Bite blog cover?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We share cookie gifting ideas, seasonal flavor guides, dessert planning tips, and updates from our New Cairo kitchen.",
        },
      },
      {
        "@type": "Question",
        name: "How often are new posts published?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We publish updates regularly and refresh our most useful guides throughout the season.",
        },
      },
    ],
  };

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-3xl px-4 text-center lg:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <SectionHeading
          title="From the kitchen journal"
          subtitle="Seasonal drops, behind-the-scenes bakes, and gifting inspiration — posts will appear here once Sanity content is wired."
        />
        <p className="mt-8 text-cb-text">
          We’re preparing bilingual articles (EN / AR) per the master content plan.
        </p>
        <div className="mt-6">
          <ShareButtons title="Cookie Bite Blog: Dessert Tips & Gift Ideas" />
        </div>
        <Link href="/shop" className={buttonClassName("primary", "mt-8 inline-flex rounded-full px-8")}>
          Shop while you wait
        </Link>
      </div>
    </div>
  );
}
