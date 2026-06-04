"use client";

import { CircularTestimonials } from "@/components/ui/circular-testimonials";
import { CIRCULAR_TESTIMONIALS } from "@/lib/data";
import { SectionHeading } from "@/components/sections/section-heading";
import { useLanguage } from "@/components/providers/language-provider";

/** قسم الشهادات الدائرية — مستخدم في صفحة Our Cookies */
export function OurCookiesTestimonials() {
  const { t } = useLanguage();

  return (
    <section className="border-t border-cb-peach-deep bg-gradient-to-b from-cb-peach/70 to-cb-cream py-16">
      <div className="mx-auto max-w-7xl cb-gutter">
        <SectionHeading
          eyebrow={t("pages.ourCookies.testimonialsEyebrow")}
          title={t("pages.ourCookies.testimonialsTitle")}
          subtitle={t("pages.ourCookies.testimonialsSubtitle")}
        />
        <div className="flex justify-center">
          <CircularTestimonials
            testimonials={CIRCULAR_TESTIMONIALS}
            autoplay
            colors={{
              name: "#261612",
              designation: "#5b4036",
              testimony: "#261612",
              arrowBackground: "#8b3a13",
              arrowForeground: "#fff9f5",
              arrowHoverBackground: "#6d2a0d",
            }}
            fontSizes={{
              name: "clamp(1.25rem, 3vw, 1.75rem)",
              designation: "0.9375rem",
              quote: "clamp(1rem, 2.5vw, 1.125rem)",
            }}
          />
        </div>
      </div>
    </section>
  );
}
