import type { Metadata } from "next";
import { GiftBoxBuilder } from "@/components/gift-box-builder/gift-box-builder";
import { translations } from "@/lib/i18n/translations";
import { getLangFromCookies } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromCookies();
  const isAr = lang === "ar";
  return {
    title: isAr
      ? "صمّم صندوق هديتك | كوكي بايت"
      : "Build Your Gift Box | Cookie Bite",
    description: isAr
      ? "اختر الصندوق، املأه بمخبوزاتك المفضلة، خصّص التغليف والرسالة، واطلب في خطوات بسيطة."
      : "Choose a box, fill it with treats, personalize wrapping and message, and checkout in five easy steps.",
    robots: { index: true, follow: true },
  };
}

export default async function GiftBoxBuildPage() {
  const lang = await getLangFromCookies();
  void translations[lang];
  return <GiftBoxBuilder />;
}
