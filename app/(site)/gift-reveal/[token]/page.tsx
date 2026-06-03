import type { Metadata } from "next";
import { cookies } from "next/headers";
import { GiftRevealClient } from "@/components/gift-box/gift-reveal-client";
import { buildPageMetadata } from "@/lib/seo";
import { LANG_COOKIE } from "@/lib/preferences/client-cookies";
import type { Lang } from "@/lib/i18n/translations";

export const metadata: Metadata = buildPageMetadata({
  title: "Open your gift",
  description: "Interactive gift reveal from Cookie Bite.",
  path: "/gift-reveal",
  noIndex: true,
});

type Props = {
  params: Promise<{ token: string }>;
};

export default async function GiftRevealPage({ params }: Props) {
  const { token } = await params;
  const cookieStore = await cookies();
  const lang = (cookieStore.get(LANG_COOKIE)?.value === "ar" ? "ar" : "en") as Lang;

  return <GiftRevealClient token={token} lang={lang} />;
}
