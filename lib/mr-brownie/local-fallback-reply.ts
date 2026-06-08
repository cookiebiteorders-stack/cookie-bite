import { getAiProductNamePool } from "@/lib/ai/website-knowledge";
import type { UserRole } from "@/lib/admin/rbac";
import { getFreeShippingThresholdEgp } from "@/lib/store/commerce-settings-server";

/** Rule-based reply when LLM/stream is unavailable — keeps chat usable offline. */
export async function buildMrBrownieLocalFallbackReply(params: {
  lastUserMessage: string;
  role: UserRole | "guest";
  locale?: "ar" | "en" | "auto";
}): Promise<string> {
  const lastUserMsg = params.lastUserMessage.toLowerCase();
  const ar =
    params.locale === "ar" ||
    (params.locale !== "en" &&
      /[\u0600-\u06FF]/.test(params.lastUserMessage));
  const threshold = await getFreeShippingThresholdEgp();
  const role = params.role;

  if (
    lastUserMsg.includes("مرحبا") ||
    lastUserMsg.includes("هلا") ||
    lastUserMsg.includes("سلام") ||
    lastUserMsg.includes("hello") ||
    lastUserMsg.includes("hi")
  ) {
    return ar
      ? "مرحباً بك! أنا مستر براوني 🐻، كيف يمكنني مساعدتك في طلب الكوكيز اليوم؟"
      : "Hi! I'm Mr. Brownie 🐻 — how can I help with cookies or gifting today?";
  }

  if (
    lastUserMsg.includes("توصيل") ||
    lastUserMsg.includes("شحن") ||
    lastUserMsg.includes("delivery") ||
    lastUserMsg.includes("shipping") ||
    lastUserMsg.includes("متى")
  ) {
    return ar
      ? `🚚 التوصيل مجاني للطلبات فوق ${threshold} جنيه! وتصلك الكوكيز طازجة خلال 1–2 يوم في القاهرة الجديدة حسب منطقتك.`
      : `🚚 Free delivery on orders over ${threshold} EGP! Fresh cookies usually arrive within 1–2 days in New Cairo, depending on your zone.`;
  }

  if (
    lastUserMsg.includes("هدية") ||
    lastUserMsg.includes("هدايا") ||
    lastUserMsg.includes("gift")
  ) {
    return ar
      ? "🎁 للهدايا جرّب /gift-box أو صمّم صندوقك من /gift-box/build. هل تريد اقتراحات نكهات حسب المناسبة؟"
      : "🎁 For gifts try /gift-box or build your own at /gift-box/build. Want flavor ideas for an occasion?";
  }

  if (
    lastUserMsg.includes("قهوة") ||
    lastUserMsg.includes("كوفي") ||
    lastUserMsg.includes("coffee")
  ) {
    return ar
      ? "☕ مع القهوة أنسب نكهات تشوكلت كلاسيك أو دارك من المتجر — أقترح لك 3 خيارات من الكتالوج الحالي إن رغبت."
      : "☕ Classic or dark chocolate cookies pair great with coffee — I can suggest three picks from our live catalog.";
  }

  if (
    lastUserMsg.includes("أكثر طلبا") ||
    lastUserMsg.includes("مشهور") ||
    lastUserMsg.includes("اكثر") ||
    lastUserMsg.includes("وين") ||
    lastUserMsg.includes("منتج") ||
    lastUserMsg.includes("كوكيز") ||
    lastUserMsg.includes("product") ||
    lastUserMsg.includes("shop")
  ) {
    const names = await getAiProductNamePool(4);
    if (names.length > 0) {
      return ar
        ? `🍪 عندنا منتجات على الموقع — جرّب مثلاً: ${names.join("، ")}. تصفّح الكل من /shop`
        : `🍪 From our catalog, try: ${names.join(", ")}. Browse everything at /shop`;
    }
    return ar
      ? "🍪 تصفّح المتجر على /shop لاختيار الكوكيز والهدايا — الكتالوج محدّث من قاعدة البيانات."
      : "🍪 Browse /shop for cookies and gift boxes — the catalog is live from our kitchen.";
  }

  if (
    lastUserMsg.includes("سعر") ||
    lastUserMsg.includes("بكم") ||
    lastUserMsg.includes("price")
  ) {
    return ar
      ? "💰 الأسعار في الكتالوج الحالي على /shop — أخبرني بميزانيتك وأقترح أنسب خيار."
      : "💰 Prices are on /shop — tell me your budget and I'll suggest the best fit.";
  }

  if (role === "staff" || role === "admin" || role === "owner") {
    if (lastUserMsg.includes("طلبات") || lastUserMsg.includes("orders")) {
      return ar
        ? "📊 (وضع الاستجابة التلقائية): راجع لوحة الطلبات /admin/orders لأحدث الأرقام."
        : "📊 (Fallback mode): check /admin/orders for the latest numbers.";
    }
    return ar
      ? `مرحباً (${role}). تعذر الاتصال بمساعد الذكاء الاصطناعي — استخدم لوحة الإدارة أو Mrs. Cookie في /admin/copilot.`
      : `Hello (${role}). AI assistant is temporarily unavailable — use the admin console or Mrs. Cookie at /admin/copilot.`;
  }

  return ar
    ? "عذراً، مشكلة مؤقتة في الاتصال بمساعد الذكاء الاصطناعي 🤖. جرّب السؤال عن التوصيل، الهدايا، أو منتجات /shop."
    : "Sorry — a temporary issue reached the AI assistant 🤖. Try asking about delivery, gifts, or products on /shop.";
}
