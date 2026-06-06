"use client";

import { useEffect } from "react";

type PreloadSnapshot = {
  href: string;
  as: string | null;
  hasMatchingStylesheet: boolean;
  stylesheetLoaded: boolean;
};

function collectPreloadSnapshots(): PreloadSnapshot[] {
  if (typeof document === "undefined") return [];
  const preloads = Array.from(
    document.querySelectorAll('link[rel="preload"]'),
  ) as HTMLLinkElement[];

  return preloads.map((link) => {
    const href = link.getAttribute("href") ?? "";
    const as = link.getAttribute("as");
    const stylesheets = Array.from(
      document.querySelectorAll('link[rel="stylesheet"]'),
    ) as HTMLLinkElement[];
    const match = stylesheets.find((s) => (s.getAttribute("href") ?? "") === href);
    let stylesheetLoaded = false;
    if (match?.sheet) {
      try {
        stylesheetLoaded = match.sheet.cssRules.length > 0;
      } catch {
        stylesheetLoaded = true;
      }
    }
    return {
      href,
      as,
      hasMatchingStylesheet: Boolean(match),
      stylesheetLoaded,
    };
  });
}

function sendDebugLog(message: string, data: Record<string, unknown>, hypothesisId: string) {
  // #region agent log
  fetch("http://127.0.0.1:7900/ingest/ffccdd5c-3993-477b-87f2-41cb04ff3b6b", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "35870a",
    },
    body: JSON.stringify({
      sessionId: "35870a",
      runId: "preload-probe",
      hypothesisId,
      location: "components/debug/preload-probe.tsx",
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

/** Temporary debug probe — maps preload links vs applied stylesheets (session 35870a). */
export function PreloadProbe() {
  useEffect(() => {
    const path = window.location.pathname;
    const logAt = (label: string, ms: number) => {
      window.setTimeout(() => {
        const snapshots = collectPreloadSnapshots();
        const cssPreloads = snapshots.filter((s) => s.href.includes(".css"));
        const unusedCssPreloads = cssPreloads.filter((s) => !s.hasMatchingStylesheet);
        sendDebugLog(
          `preload snapshot @ ${label}`,
          {
            path,
            msSinceLoad: ms,
            preloadCount: snapshots.length,
            cssPreloadCount: cssPreloads.length,
            unusedCssPreloadCount: unusedCssPreloads.length,
            cssPreloads: cssPreloads.map((s) => ({
              href: s.href.split("/").pop(),
              as: s.as,
              hasMatchingStylesheet: s.hasMatchingStylesheet,
              stylesheetLoaded: s.stylesheetLoaded,
            })),
            nextStylesheetCount: document.querySelectorAll(
              'link[rel="stylesheet"][href*="/_next/static/"]',
            ).length,
          },
          unusedCssPreloads.length > 0 ? "H1" : "H2",
        );
      }, ms);
    };

    logAt("500ms", 500);
    logAt("3s", 3000);
    logAt("6s", 6000);

    const onError = (event: ErrorEvent) => {
      const msg = event.message ?? "";
      if (msg.toLowerCase().includes("node cannot be found")) {
        sendDebugLog(
          "window error mentioning node",
          { path, message: msg },
          "H4",
        );
      }
    };
    window.addEventListener("error", onError);

    return () => window.removeEventListener("error", onError);
  }, []);

  return null;
}
