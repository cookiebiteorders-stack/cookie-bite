export const MR_BROWNIE_FAB_STORAGE_KEY = "mr-brownie-fab-v2";

export type MrBrownieFabPosition = {
  side: "left" | "right";
  /** مسافة من أسفل نافذة العرض (بالبكسل) */
  bottomPx: number;
};

/** موبايل: حجم مريح ولا يغطي المحتوى — يطابق `(max-width: 639px)` في الواجهة */
export const FAB_SIZE_MOBILE_PX = 68;
/** سطح المكتب / تابلت: أوضح على الصفحة */
export const FAB_SIZE_DESKTOP_PX = 92;

export function fabSizePx(isMobile: boolean): number {
  return isMobile ? FAB_SIZE_MOBILE_PX : FAB_SIZE_DESKTOP_PX;
}

/** @deprecated استخدم fabSizePx(isMobile) — يبقى للتوافق مع أي استيراد قديم */
export const FAB_SIZE_PX = FAB_SIZE_DESKTOP_PX;

/** هامش أفقي من حافة الشاشة — لا يلتصق Mr. Brownie بالجانب */
const EDGE_INSET_MOBILE = 20;
const EDGE_INSET_DESKTOP = 28;

export function defaultFabPosition(isMobile: boolean): MrBrownieFabPosition {
  return {
    side: "right",
    bottomPx: isMobile ? 168 : 32,
  };
}

export function loadFabPosition(): MrBrownieFabPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MR_BROWNIE_FAB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as MrBrownieFabPosition).side &&
      typeof (parsed as MrBrownieFabPosition).bottomPx === "number"
    ) {
      const side = (parsed as MrBrownieFabPosition).side;
      if (side === "left" || side === "right") {
        return {
          side,
          bottomPx: (parsed as MrBrownieFabPosition).bottomPx,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveFabPosition(pos: MrBrownieFabPosition): void {
  try {
    sessionStorage.setItem(MR_BROWNIE_FAB_STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

/** يحدّ الموضع الرأسي بين الهيدر وشريط التبويب/الحافة الآمنة */
export function clampFabBottom(
  bottomPx: number,
  viewportH: number,
  isMobile: boolean,
): number {
  const safeBottom = isMobile ? 200 : 24;
  const safeTop = 72;
  const size = fabSizePx(isMobile);
  const maxBottom = viewportH - safeTop - size;
  const minBottom = safeBottom;
  const v = Number.isFinite(bottomPx) ? bottomPx : minBottom;
  return Math.round(Math.min(maxBottom, Math.max(minBottom, v)));
}

/** مغناطيس أفقي: أي جانب أقرب لمركز الزر */
export function snapFabSide(
  buttonCenterX: number,
  viewportW: number,
): "left" | "right" {
  return buttonCenterX < viewportW / 2 ? "left" : "right";
}

/** بعد التصاق بالجانب، left أو right ثابتان و bottomPx من أسفل المستطيل */
export function rectToFabPosition(
  rect: DOMRect,
  viewportW: number,
  viewportH: number,
  isMobile: boolean,
): MrBrownieFabPosition {
  const centerX = rect.left + rect.width / 2;
  const side = snapFabSide(centerX, viewportW);
  const bottomPx = viewportH - rect.bottom;
  return {
    side,
    bottomPx: clampFabBottom(bottomPx, viewportH, isMobile),
  };
}

export function fabInsetPx(isMobile = false): number {
  return isMobile ? EDGE_INSET_MOBILE : EDGE_INSET_DESKTOP;
}

/** موضع الزاوية العلوية اليسرى للزر الثابت من قيمة محفوظة (للمزامنة البصرية والأنيميشن). */
export function fabTopLeftFromStored(
  pos: MrBrownieFabPosition,
  viewportW: number,
  viewportH: number,
  isMobile: boolean,
): { left: number; top: number } {
  const inset = fabInsetPx(isMobile);
  const size = fabSizePx(isMobile);
  const left =
    pos.side === "left" ? inset : viewportW - inset - size;
  const top = viewportH - pos.bottomPx - size;
  return { left, top };
}
