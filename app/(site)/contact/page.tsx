import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";
import { SectionHeading } from "@/components/sections/section-heading";

export const metadata: Metadata = {
  title: "Contact",
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
