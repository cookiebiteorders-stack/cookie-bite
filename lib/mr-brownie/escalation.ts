import type { ChatActionCard } from "@/lib/mr-brownie/action-cards";
import { siteConfig } from "@/lib/site-config";

export function buildEscalationActionCards(
  locale: "ar" | "en" | "auto",
  crisisMode: boolean,
): ChatActionCard[] {
  if (!crisisMode) return [];

  const ar = locale !== "en";
  const cards: ChatActionCard[] = [
    {
      id: "help",
      path: "/help",
      label_en: "Help center",
      label_ar: "مركز المساعدة",
      icon: "help",
    },
  ];

  const wa = siteConfig.whatsappNumber?.replace(/\D/g, "");
  if (wa) {
    cards.push({
      id: "whatsapp",
      path: `https://wa.me/${wa}`,
      label_en: "Chat on WhatsApp",
      label_ar: "تواصل عبر واتساب",
      icon: "help",
    });
  }

  return cards;
}
