import { fabInsetPx, fabSizePx } from "@/lib/mr-brownie/fab-position";

export function pickRoamingTarget(isMobile: boolean): { left: number; top: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const inset = fabInsetPx(isMobile);
  const size = fabSizePx(isMobile);
  const safeTop = 72;
  /** موبايل: شريط تبويب + واتساب + زر الهدايا المرتفع */
  const safeBottom = isMobile ? 200 : 96;
  const yMin = safeTop;
  const yMax = vh - safeBottom - size;

  const xMin = inset;
  const xMax = vw - inset - size;
  const left = xMin + Math.random() * Math.max(1, xMax - xMin);

  const topBand = isMobile ? 0.55 : 1;
  const bandMax = yMin + (yMax - yMin) * topBand;
  const top = yMin + Math.random() * Math.max(1, bandMax - yMin);

  return {
    left: Math.round(left),
    top: Math.round(Math.min(Math.max(top, yMin), yMax)),
  };
}
