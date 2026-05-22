import { ContactPageBody } from "@/components/pages/contact-page-body";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Contact Cookie Bite New Cairo",
  description:
    "Contact Cookie Bite for custom cookie orders, gifting support, wholesale, and delivery help in New Cairo.",
  path: "/contact",
  keywords: [
    "contact cookie bite",
    "cookie bite support",
    "cookie delivery support cairo",
    "custom cookie order egypt",
  ],
});

export default function ContactPage() {
  return <ContactPageBody />;
}
