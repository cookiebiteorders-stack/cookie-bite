/** أقصى عرض للفقاعة (px) — يُضيَّق داخل الحواف الآمنة */
export const AMBIENT_BUBBLE_MAX_W_PX = 256;

/** هامش من حافة نافذة العرض حتى لا يُقصّ النص */
export function bubbleViewportPadPx(isMobile: boolean): number {
  return isMobile ? 16 : 20;
}

export type AmbientBubbleLayout = {
  widthPx: number;
  /** موضع يسار الفقاعة نسبةً لزر الـ FAB */
  leftPx: number;
  /** موضع ذيل الفقاعة كنسبة مئوية من عرضها */
  tailPercent: number;
};

/** يضبط عرض الفقاعة وأفقياً داخل الشاشة مع ذيل يشير لمركز الأيقونة */
export function layoutAmbientBubble(
  fabLeft: number,
  fabSizePx: number,
  viewportW: number,
  isMobile: boolean,
): AmbientBubbleLayout {
  const pad = bubbleViewportPadPx(isMobile);
  const widthPx = Math.min(
    AMBIENT_BUBBLE_MAX_W_PX,
    Math.max(200, viewportW - pad * 2),
  );
  const fabCenter = fabLeft + fabSizePx / 2;
  const idealBubbleLeft = fabCenter - widthPx / 2;
  const clampedBubbleLeft = Math.max(
    pad,
    Math.min(idealBubbleLeft, viewportW - pad - widthPx),
  );
  const leftPx = Math.round(clampedBubbleLeft - fabLeft);
  const tailPercent = Math.min(
    92,
    Math.max(8, ((fabCenter - clampedBubbleLeft) / widthPx) * 100),
  );
  return { widthPx, leftPx, tailPercent };
}
