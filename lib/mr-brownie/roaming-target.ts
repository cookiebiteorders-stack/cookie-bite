import { fabInsetPx, fabSizePx } from "@/lib/mr-brownie/fab-position";

export function pickRoamingTarget(isMobile: boolean): { left: number; top: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const inset = fabInsetPx();
  const size = fabSizePx(isMobile);
  const safeTop = 72;
  /** موبايل: شريط تبويب + واتساب + زر الهدايا المرتفع */
  const safeBottom = isMobile ? 200 : 96;
  const yMin = safeTop;
  const yMax = vh - safeBottom - size;

  const side: "left" | "right" =
    isMobile && Math.random() < 0.65 ? "right" : Math.random() < 0.5 ? "left" : "right";
  const left = side === "left" ? inset : vw - size - inset;

  const topBand = isMobile ? 0.55 : 1;
  const bandMax = yMin + (yMax - yMin) * topBand;
  const top = yMin + Math.random() * Math.max(1, bandMax - yMin);

  return {
    left: Math.round(left),
    top: Math.round(Math.min(Math.max(top, yMin), yMax)),
  };
}
