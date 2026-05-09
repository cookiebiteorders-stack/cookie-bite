export const MR_BROWNIE_FAB_STORAGE_KEY = "mr-brownie-fab-v1";

export type MrBrownieFabPosition = {
  side: "left" | "right";
  /** مسافة من أسفل نافذة العرض (بالبكسل) */
  bottomPx: number;
};

const FAB_SIZE = 56;
const EDGE_INSET = 16;

export function defaultFabPosition(isMobile: boolean): MrBrownieFabPosition {
  return {
    side: "left",
    bottomPx: isMobile ? 100 : 32,
  };
}

export function loadFabPosition(): MrBrownieFabPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MR_BROWNIE_FAB_STORAGE_KEY);
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
    localStorage.setItem(MR_BROWNIE_FAB_STORAGE_KEY, JSON.stringify(pos));
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
  const maxBottom = viewportH - safeTop - FAB_SIZE;
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

export const FAB_SIZE_PX = FAB_SIZE;

/** موضع الزاوية العلوية اليسرى للزر الثابت من قيمة محفوظة (للمزامنة البصرية والأنيميشن). */
export function fabTopLeftFromStored(
  pos: MrBrownieFabPosition,
  viewportW: number,
  viewportH: number,
): { left: number; top: number } {
  const inset = fabInsetPx();
  const left =
    pos.side === "left" ? inset : viewportW - inset - FAB_SIZE;
  const top = viewportH - pos.bottomPx - FAB_SIZE;
  return { left, top };
}
