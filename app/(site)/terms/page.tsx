import type { Metadata } from "next";
import { TermsPageContent } from "@/components/pages/terms-page-content";
import { buildLocalizedPageMetadata } from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/terms", lang);
}

export default function TermsPage() {
  return <TermsPageContent />;
}
