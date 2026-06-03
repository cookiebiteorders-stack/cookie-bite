import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { GiftPreviewClient } from "@/components/gift-box/gift-preview-client";
import { getGiftBoxByShareToken } from "@/lib/gift-box/share";
import { buildPageMetadata } from "@/lib/seo";
import { LANG_COOKIE } from "@/lib/preferences/client-cookies";
import type { Lang } from "@/lib/i18n/translations";

export const metadata: Metadata = buildPageMetadata({
  title: "Gift box preview",
  description: "Preview a custom Cookie Bite gift box design.",
  path: "/gift-preview",
  noIndex: true,
});

type Props = {
  params: Promise<{ token: string }>;
};

export default async function GiftPreviewPage({ params }: Props) {
  const { token } = await params;
  const box = await getGiftBoxByShareToken(token);
  if (!box) notFound();

  const cookieStore = await cookies();
  const lang = (cookieStore.get(LANG_COOKIE)?.value === "ar" ? "ar" : "en") as Lang;

  return <GiftPreviewClient box={box} lang={lang} />;
}
