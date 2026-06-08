"use client";

import { ContactForm } from "@/components/contact/contact-form";
import { SectionHeading } from "@/components/sections/section-heading";
import { useLanguage } from "@/components/providers/language-provider";
import { useBusinessHours } from "@/components/providers/store-business-settings-provider";
import { BRAND, brandLocation } from "@/lib/brand";

export function ContactPageBody() {
  const { t, lang } = useLanguage();
  const businessHours = useBusinessHours();
  const phoneHref = `+${BRAND.whatsappE164}`;
  const location = brandLocation(lang);

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto grid max-w-7xl gap-12 cb-gutter lg:grid-cols-2">
        <div>
          <SectionHeading
            align="start"
            eyebrow={t("pages.contact.eyebrow")}
            title={t("pages.contact.title")}
            subtitle={t("pages.contact.subtitle")}
          />
          <ul className="mt-8 space-y-3 font-medium text-cb-text">
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
            <li>{location}</li>
            <li>{businessHours}</li>
          </ul>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
