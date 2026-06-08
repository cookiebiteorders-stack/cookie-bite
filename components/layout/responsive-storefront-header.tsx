"use client";

import { useLayoutEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MobileHeader } from "@/components/layout/mobile-header";

const SiteHeader = dynamic(
  () => import("@/components/layout/site-header").then((m) => m.SiteHeader),
  { ssr: false, loading: () => null },
);

type ViewportMode = "mobile" | "desktop";

function readViewportMode(): ViewportMode {
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}

/**
 * Mobile header is imported statically so SSR and the first client paint match
 * (dynamic() around MobileHeader caused Suspense on the server vs <header> on the client).
 * Desktop header loads only after viewport measurement — client-only chunk.
 */
export function ResponsiveStorefrontHeader() {
  const [mode, setMode] = useState<ViewportMode>("mobile");

  useLayoutEffect(() => {
    const sync = () => setMode(readViewportMode());
    sync();
    const mq = window.matchMedia("(max-width: 767px)");
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (mode === "mobile") {
    return <MobileHeader />;
  }

  return (
    <>
      <div className="desktop-header">
        <SiteHeader />
      </div>
      <div className="cb-header-spacer hidden lg:block" aria-hidden />
    </>
  );
}
