export const COPILOT_FAB_STORAGE_KEY = "mrs-cookie-fab-v1";

export type CopilotFabPosition = {
  side: "left" | "right";
  bottomPx: number;
};

export const COPILOT_FAB_SIZE_MOBILE_PX = 56;
export const COPILOT_FAB_SIZE_DESKTOP_PX = 64;

const EDGE_INSET = 8;

export function copilotFabSizePx(isMobile: boolean): number {
  return isMobile ? COPILOT_FAB_SIZE_MOBILE_PX : COPILOT_FAB_SIZE_DESKTOP_PX;
}

export function defaultCopilotFabPosition(isMobile: boolean): CopilotFabPosition {
  return {
    side: "right",
    bottomPx: isMobile ? 96 : 28,
  };
}

export function loadCopilotFabPosition(): CopilotFabPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COPILOT_FAB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as CopilotFabPosition).side &&
      typeof (parsed as CopilotFabPosition).bottomPx === "number"
    ) {
      const side = (parsed as CopilotFabPosition).side;
      if (side === "left" || side === "right") {
        return {
          side,
          bottomPx: (parsed as CopilotFabPosition).bottomPx,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveCopilotFabPosition(pos: CopilotFabPosition): void {
  try {
    localStorage.setItem(COPILOT_FAB_STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

export function clampCopilotFabBottom(
  bottomPx: number,
  viewportH: number,
  isMobile: boolean,
): number {
  const safeBottom = isMobile ? 80 : 20;
  const safeTop = 64;
  const size = copilotFabSizePx(isMobile);
  const maxBottom = viewportH - safeTop - size;
  const minBottom = safeBottom;
  const v = Number.isFinite(bottomPx) ? bottomPx : minBottom;
  return Math.round(Math.min(maxBottom, Math.max(minBottom, v)));
}

export function snapCopilotFabSide(
  buttonCenterX: number,
  viewportW: number,
): "left" | "right" {
  return buttonCenterX < viewportW / 2 ? "left" : "right";
}

export function copilotFabInsetPx(): number {
  return EDGE_INSET;
}

export function rectToCopilotFabPosition(
  rect: DOMRect,
  viewportW: number,
  viewportH: number,
  isMobile: boolean,
): CopilotFabPosition {
  const centerX = rect.left + rect.width / 2;
  const side = snapCopilotFabSide(centerX, viewportW);
  const bottomPx = viewportH - rect.bottom;
  return {
    side,
    bottomPx: clampCopilotFabBottom(bottomPx, viewportH, isMobile),
  };
}

export function clampCopilotDragPosition(
  left: number,
  top: number,
  viewportW: number,
  viewportH: number,
  isMobile: boolean,
) {
  const inset = copilotFabInsetPx();
  const size = copilotFabSizePx(isMobile);
  return {
    left: Math.max(inset, Math.min(viewportW - size - inset, left)),
    top: Math.max(64, Math.min(viewportH - size - (isMobile ? 88 : inset), top)),
  };
}
