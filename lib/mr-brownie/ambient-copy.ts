import { translations, type Lang } from "@/lib/i18n/translations";

/** الحركة العشوائية + رسالة فقاعة: كل 30 ثانية */
export const ROAM_INTERVAL_MS = 30_000;
/** مدة انتقال التجوّل (يجب أن تطابق CSS `.cb-mr-brownie-fab--roaming`) */
export const ROAM_TRANSITION_MS = 520;
export const BUBBLE_AUTO_HIDE_MS = 8_000;
/** عند سحب الأيقونة لمكان معيّن: تبقى ثابتة 10 دقائق قبل استئناف الحركة */
export const DRAG_HOLD_MS = 10 * 60_000;
/** بعد انتهاء انتقال الحركة: إظهار فقاعة النص */
export const ROAM_POST_UI_MS = ROAM_TRANSITION_MS + 48;
export const ROAM_STORAGE_KEY = "mr-brownie-roam-pos-v1";

function ambientBlock(locale: Lang) {
  const block = translations[locale].mrBrownieChat as {
    ambient: Record<string, string>;
  };
  return block.ambient;
}

export function buildAmbientMessages(
  isSignedIn: boolean,
  cartLines: number,
  locale: Lang = "ar",
): readonly string[] {
  const a = ambientBlock(locale);
  const common = [a.common0, a.common1, a.common2, a.common3, a.common4];
  const withAuth = isSignedIn
    ? [...common, a.signedIn0, a.signedIn1]
    : [...common, a.signedOut0, a.signedOut1];
  if (cartLines > 0) return [...withAuth, a.withCart0, a.withCart1];
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
