import type { Metadata } from "next";
import { Suspense } from "react";
import { MysteryBoxClient } from "@/components/mystery-box/mystery-box-client";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  getPageSeoEntry,
} from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { translations } from "@/lib/i18n/translations";
import { listActiveMysteryRules } from "@/lib/mystery-box/rules";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  const entry = getPageSeoEntry("/mystery-box", lang);
  return buildPageMetadata({
    title: entry.title,
    description: entry.description,
    path: "/mystery-box",
    keywords: entry.keywords,
    lang,
  });
}

export default async function MysteryBoxPage() {
  const lang = await getLangFromCookies();
  const dict = translations[lang];
  const rules = await listActiveMysteryRules();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: (dict.tabs as { home: string }).home, path: "/" },
    { name: (dict.userMenu as { giftBox: string }).giftBox, path: "/gift-box" },
    {
      name: lang === "ar" ? "صندوق المفاجأة" : "Mystery box",
      path: "/mystery-box",
    },
  ]);

  return (
    <>
      <JsonLdScript id="mystery-box-breadcrumb" json={breadcrumbJsonLd} />
      <Suspense
        fallback={
          <div className="mystery-page min-h-[75vh] animate-pulse bg-cb-peach/20 py-16" />
        }
      >
        <MysteryBoxClient initialRules={rules} />
      </Suspense>
    </>
  );
}
