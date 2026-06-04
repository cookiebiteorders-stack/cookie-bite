/** الحركة العشوائية صارت أبطأ: كل 4 دقائق */
export const ROAM_INTERVAL_MS = 4 * 60_000;
export const BUBBLE_AUTO_HIDE_MS = 10_000;
/** عند سحب الأيقونة لمكان معيّن: تبقى ثابتة 10 دقائق قبل استئناف الحركة */
export const DRAG_HOLD_MS = 10 * 60_000;
/** بعد انتهاء انتقال الحركة: إظهار فقاعة النص */
export const ROAM_POST_UI_MS = 1040;
export const ROAM_STORAGE_KEY = "mr-brownie-roam-pos-v1";

export const AMBIENT_MESSAGES_COMMON = [
  "👋 تحتاج مساعدة سريعة؟ أنا هنا.",
  "💡 أستطيع اقتراح منتج يناسب ذوقك.",
  "🚚 اسألني عن الشحن والتوصيل في منطقتك.",
  "🎁 أستطيع مساعدتك في اختيار هدية مناسبة.",
  "✨ لديك مناسبة معيّنة؟ أرتّب لك الخطوات.",
] as const;

export const AMBIENT_MESSAGES_SIGNED_OUT = [
  "🔐 بعد تسجيل الدخول أستطيع مساعدتك بدقة أكبر.",
  "🛍️ اسألني عن أفضل المنتجات المتوفرة حالياً.",
] as const;

export const AMBIENT_MESSAGES_SIGNED_IN = [
  "🤝 أهلاً بعودتك! جاهز لمساعدتك.",
  "📦 أستطيع الإجابة عن الطلبات والتجهيز حسب سياقك.",
] as const;

export const AMBIENT_MESSAGES_WITH_CART = [
  "🧺 لديك منتجات في السلة — هل تريد إتمام الطلب؟",
  "💬 أستطيع مراجعة السلة معك قبل الدفع.",
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
