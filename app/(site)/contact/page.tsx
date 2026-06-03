import type { Metadata } from "next";
import { ContactPageBody } from "@/components/pages/contact-page-body";
import { buildLocalizedPageMetadata } from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/contact", lang);
}

export default function ContactPage() {
  return <ContactPageBody />;
}
