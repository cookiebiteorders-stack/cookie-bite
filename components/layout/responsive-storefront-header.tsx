"use client";

import dynamic from "next/dynamic";
import { StorefrontHeaderShell } from "@/components/layout/storefront-header-shell";
import { useStorefrontHeaderMode } from "@/lib/hooks/use-storefront-header-mode";

const MobileHeader = dynamic(
  () => import("@/components/layout/mobile-header").then((m) => m.MobileHeader),
  { loading: () => <StorefrontHeaderShell /> },
);

const SiteHeader = dynamic(
  () => import("@/components/layout/site-header").then((m) => m.SiteHeader),
  { loading: () => <StorefrontHeaderShell /> },
);

/** هيدر واحد فقط حسب العرض — chunks منفصلة لتقليل JS على الموبايل */
export function ResponsiveStorefrontHeader() {
  const mode = useStorefrontHeaderMode();

  if (mode === "shell") {
    return <StorefrontHeaderShell />;
  }

  if (mode === "desktop") {
    return (
      <div className="desktop-header">
        <SiteHeader />
        <div className="cb-header-spacer hidden md:block" aria-hidden />
      </div>
    );
  }

  return <MobileHeader />;
}
