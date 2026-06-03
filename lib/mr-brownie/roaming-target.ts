import { fabInsetPx, fabSizePx } from "@/lib/mr-brownie/fab-position";

export function pickRoamingTarget(isMobile: boolean): { left: number; top: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const inset = fabInsetPx();
  const size = fabSizePx(isMobile);
  const safeTop = 72;
  const safeBottom = isMobile ? 100 : 82;
  const side: "left" | "right" = Math.random() < 0.5 ? "left" : "right";
  const left = side === "left" ? inset : vw - size - inset;
  const yMin = safeTop;
  const yMax = vh - safeBottom - size;
  const top = yMin + Math.random() * Math.max(1, yMax - yMin);
  return {
    left: Math.round(left),
    top: Math.round(Math.min(Math.max(top, yMin), yMax)),
  };
}
