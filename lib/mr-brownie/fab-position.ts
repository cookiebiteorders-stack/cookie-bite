export const MR_BROWNIE_FAB_STORAGE_KEY = "mr-brownie-fab-v2";

export type MrBrownieFabPosition = {
  side: "left" | "right";
  /** مسافة من أسفل نافذة العرض (بالبكسل) */
  bottomPx: number;
};

/** موبايل: حجم مريح ولا يغطي المحتوى — يطابق `(max-width: 639px)` في الواجهة */
export const FAB_SIZE_MOBILE_PX = 78;
/** سطح المكتب / تابلت: أوضح على الصفحة */
export const FAB_SIZE_DESKTOP_PX = 92;

export function fabSizePx(isMobile: boolean): number {
  return isMobile ? FAB_SIZE_MOBILE_PX : FAB_SIZE_DESKTOP_PX;
}

/** @deprecated استخدم fabSizePx(isMobile) — يبقى للتوافق مع أي استيراد قديم */
export const FAB_SIZE_PX = FAB_SIZE_DESKTOP_PX;

/** تثبيت قريب من حافة نافذة المتصفح (وليس حاوية المحتوى) */
const EDGE_INSET = 6;

export function defaultFabPosition(isMobile: boolean): MrBrownieFabPosition {
  return {
    side: "left",
    bottomPx: isMobile ? 100 : 32,
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
  const safeBottom = isMobile ? 88 : 24;
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

export function fabInsetPx(): number {
  return EDGE_INSET;
}

/** موضع الزاوية العلوية اليسرى للزر الثابت من قيمة محفوظة (للمزامنة البصرية والأنيميشن). */
export function fabTopLeftFromStored(
  pos: MrBrownieFabPosition,
  viewportW: number,
  viewportH: number,
  isMobile: boolean,
): { left: number; top: number } {
  const inset = fabInsetPx();
  const size = fabSizePx(isMobile);
  const left =
    pos.side === "left" ? inset : viewportW - inset - size;
  const top = viewportH - pos.bottomPx - size;
  return { left, top };
}
