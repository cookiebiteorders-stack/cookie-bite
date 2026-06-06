"use client";

import { useEffect } from "react";

type BlockerInfo = {
  tag: string;
  id: string;
  className: string;
  pointerEvents: string;
  opacity: string;
  visibility: string;
  display: string;
  zIndex: string;
  rect: { w: number; h: number };
};

function scanFullScreenBlockers(): BlockerInfo[] {
  if (typeof document === "undefined") return [];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const blockers: BlockerInfo[] = [];

  for (const el of document.querySelectorAll<HTMLElement>("body *")) {
    const style = getComputedStyle(el);
    if (style.position !== "fixed" && style.position !== "absolute") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < vw * 0.85 || rect.height < vh * 0.85) continue;
    if (style.pointerEvents === "none") continue;
    if (style.visibility === "hidden" || style.display === "none") continue;
    const opacity = Number.parseFloat(style.opacity);
    if (!Number.isNaN(opacity) && opacity < 0.05) continue;

    blockers.push({
      tag: el.tagName.toLowerCase(),
      id: el.id,
      className: el.className?.toString?.().slice(0, 120) ?? "",
      pointerEvents: style.pointerEvents,
      opacity: style.opacity,
      visibility: style.visibility,
      display: style.display,
      zIndex: style.zIndex,
      rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
    });
  }

  return blockers.sort((a, b) => Number(b.zIndex) - Number(a.zIndex));
}

function sendDebugLog(
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
) {
  // #region agent log
  fetch("http://127.0.0.1:7900/ingest/ffccdd5c-3993-477b-87f2-41cb04ff3b6b", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "35870a",
    },
    body: JSON.stringify({
      sessionId: "35870a",
      runId: "click-block-probe",
      hypothesisId,
      location: "components/debug/click-block-probe.tsx",
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

/** Detects invisible overlays / wrong hit targets blocking storefront clicks. */
export function ClickBlockProbe() {
  useEffect(() => {
    const path = window.location.pathname;

    const reportScan = (label: string) => {
      const blockers = scanFullScreenBlockers();
      sendDebugLog(
        `overlay scan: ${label}`,
        { path, blockerCount: blockers.length, blockers: blockers.slice(0, 8) },
        blockers.length > 0 ? "H1" : "H2",
      );
    };

    reportScan("mount");
    const t1 = window.setTimeout(() => reportScan("2s"), 2000);
    const t2 = window.setTimeout(() => reportScan("5s"), 5000);

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      const link = target?.closest("a[href]");
      const button = target?.closest("button");
      const topAtPoint = document.elementFromPoint(e.clientX, e.clientY);
      const topLink = topAtPoint?.closest("a[href]");
      const mismatch =
        link != null &&
        topAtPoint != null &&
        link !== topLink &&
        !topAtPoint.contains(link);

      sendDebugLog(
        "pointerdown on storefront",
        {
          path,
          x: e.clientX,
          y: e.clientY,
          targetTag: target?.tagName?.toLowerCase() ?? null,
          targetClass: (target as HTMLElement | null)?.className?.toString?.().slice(0, 80) ?? null,
          hasLinkAncestor: Boolean(link),
          linkHref: link?.getAttribute("href") ?? null,
          hasButtonAncestor: Boolean(button),
          topAtPointTag: topAtPoint?.tagName?.toLowerCase() ?? null,
          topAtPointClass:
            (topAtPoint as HTMLElement | null)?.className?.toString?.().slice(0, 80) ?? null,
          topLinkHref: topLink?.getAttribute("href") ?? null,
          hitMismatch: mismatch,
        },
        mismatch ? "H1" : link ? "H3" : "H4",
      );
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
    };
  }, []);

  return null;
}
