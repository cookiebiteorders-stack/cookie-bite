import type { Metadata } from "next";
import { PrivacyPageContent } from "@/components/pages/privacy-page-content";
import { buildLocalizedPageMetadata } from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/privacy", lang);
}

export default function PrivacyPage() {
  return <PrivacyPageContent />;
}
