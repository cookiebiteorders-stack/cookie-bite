export const ROAM_INTERVAL_MS = 10_000;
export const BUBBLE_AUTO_HIDE_MS = 10_000;
/** بعد انتهاء انتقال الحركة: إظهار فقاعة النص */
export const ROAM_POST_UI_MS = 1040;
export const ROAM_STORAGE_KEY = "mr-brownie-roam-pos-v1";

export const AMBIENT_MESSAGES_COMMON = [
  "👋 محتاج مساعدة سريعة؟ أنا معاك.",
  "💡 أقدر أرشّح لك منتج حسب ذوقك.",
  "🚚 لو حابب أعرفك على الشحن والتوصيل اكتبلي.",
  "🎁 أقدر أساعدك تختار هدية مناسبة فوراً.",
  "✨ عندك هدف معين؟ قولي وأنا أرتّب لك الخطوات.",
] as const;

export const AMBIENT_MESSAGES_SIGNED_OUT = [
  "🔐 لو سجّلت دخولك هقدر أساعدك بشكل أدق.",
  "🛍️ جرّب تسألني عن أفضل المنتجات حالياً.",
] as const;

export const AMBIENT_MESSAGES_SIGNED_IN = [
  "🤝 أهلاً بيك تاني! جاهز أساعدك فوراً.",
  "📦 أقدر أجاوبك عن الطلبات والتجهيز حسب السياق.",
] as const;

export const AMBIENT_MESSAGES_WITH_CART = [
  "🧺 شايف عندك منتجات في السلة — تحب أساعدك تكمل الطلب؟",
  "💬 أقدر أراجع السلة معاك قبل الدفع.",
] as const;

export function buildAmbientMessages(
  isSignedIn: boolean,
  cartLines: number,
): readonly string[] {
  const withAuth = isSignedIn
    ? [...AMBIENT_MESSAGES_COMMON, ...AMBIENT_MESSAGES_SIGNED_IN]
    : [...AMBIENT_MESSAGES_COMMON, ...AMBIENT_MESSAGES_SIGNED_OUT];
  if (cartLines > 0) return [...withAuth, ...AMBIENT_MESSAGES_WITH_CART];
  return withAuth;
}

export function loadRoamingPosition(): { left: number; top: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ROAM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { left?: unknown }).left === "number" &&
      typeof (parsed as { top?: unknown }).top === "number"
    ) {
      return {
        left: (parsed as { left: number }).left,
        top: (parsed as { top: number }).top,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveRoamingPosition(pos: { left: number; top: number }): void {
  try {
    sessionStorage.setItem(ROAM_STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}
