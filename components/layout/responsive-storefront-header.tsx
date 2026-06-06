"use client";

import { useLayoutEffect, useState } from "react";
import dynamic from "next/dynamic";

const SiteHeader = dynamic(
  () => import("@/components/layout/site-header").then((m) => m.SiteHeader),
  { ssr: true },
);

const MobileHeader = dynamic(
  () => import("@/components/layout/mobile-header").then((m) => m.MobileHeader),
  { ssr: true },
);

type ViewportMode = "mobile" | "desktop" | "unknown";

function readViewportMode(): ViewportMode {
  if (typeof window === "undefined") return "unknown";
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}

/**
 * يحمّل هيدراً واحداً فقط — الموبايل لا يحمّل chunk الهيدر المكتبي (motion + Clerk slot).
 * أول رسم: موبايل افتراضياً (يتوافق مع CSS الحرج) ثم يُصحَّح على الديسكتوب بعد القياس.
 */
export function ResponsiveStorefrontHeader() {
  const [mode, setMode] = useState<ViewportMode>("unknown");

  useLayoutEffect(() => {
    const sync = () => setMode(readViewportMode());
    sync();
    const mq = window.matchMedia("(max-width: 767px)");
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const showMobile = mode !== "desktop";

  if (showMobile) {
    return <MobileHeader />;
  }

  return (
    <>
      <div className="desktop-header">
        <SiteHeader />
      </div>
      <div className="hidden h-16 lg:block" aria-hidden />
    </>
  );
}
