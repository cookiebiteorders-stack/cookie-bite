import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Blog",
  description: "Stories, flavors, and gifting ideas from Cookie Bite.",
};

export default function BlogIndexPage() {
  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-3xl px-4 text-center lg:px-6">
        <SectionHeading
          title="From the kitchen journal"
          subtitle="Seasonal drops, behind-the-scenes bakes, and gifting inspiration — posts will appear here once Sanity content is wired."
        />
        <p className="mt-8 text-cb-text">
          We’re preparing bilingual articles (EN / AR) per the master content plan.
        </p>
        <Link href="/shop" className={buttonClassName("primary", "mt-8 inline-flex rounded-full px-8")}>
          Shop while you wait
        </Link>
      </div>
    </div>
  );
}
