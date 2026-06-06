import type { Metadata } from "next";
import { WishlistShareClient } from "@/components/pages/wishlist-share-client";
import { translations } from "@/lib/i18n/translations";
import { getLangFromCookies } from "@/lib/seo/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  const pages = translations[lang].pages as {
    wishlistShare?: { metaTitle?: string };
  };
  const title = pages.wishlistShare?.metaTitle ?? "Shared wishlist";
  return {
    title,
    robots: { index: false, follow: true },
  };
}

export default async function WishlistSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <WishlistShareClient token={token} />;
}
