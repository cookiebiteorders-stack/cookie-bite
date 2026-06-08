"use client";

import dynamic from "next/dynamic";
import { ResponsiveStorefrontHeader } from "@/components/layout/responsive-storefront-header";
import { AnnouncementProvider } from "@/components/providers/announcement-provider";
import { CartProvider } from "@/components/providers/cart-provider";
import { StaffAdminNavProvider } from "@/components/providers/staff-admin-nav-provider";
import { cn } from "@/lib/utils";
import { TopAnnouncementSlot } from "@/components/layout/top-announcement-slot";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { DeferredShellChrome } from "@/components/layout/deferred-shell-chrome";
import { StorefrontRuntimeEffects } from "@/components/layout/storefront-runtime-effects";

const StorefrontAnnouncementOverlays = dynamic(
  () =>
    import("@/components/announcements/announcement-engine").then((m) => ({
      default: m.StorefrontAnnouncementOverlays,
    })),
  { ssr: false, loading: () => null },
);

const CartDrawerGate = dynamic(
  () => import("@/components/layout/cart-drawer-gate").then((m) => m.CartDrawerGate),
  { ssr: false, loading: () => null },
);

const WhatsAppFab = dynamic(
  () => import("@/components/layout/whatsapp-fab").then((m) => m.WhatsAppFab),
  { ssr: false, loading: () => null },
);

const MrBrownieHost = dynamic(
  () => import("@/components/mr-brownie/mr-brownie-host").then((m) => m.MrBrownieHost),
  { ssr: false, loading: () => null },
);

const SiteFooter = dynamic(
  () => import("@/components/layout/site-footer").then((m) => m.SiteFooter),
  { ssr: true },
);

const MobileFooter = dynamic(
  () => import("@/components/layout/mobile-footer").then((m) => m.MobileFooter),
  { ssr: true },
);

const MobileTabBar = dynamic(
  () => import("@/components/layout/mobile-tab-bar").then((m) => m.MobileTabBar),
  { ssr: false, loading: () => null },
);

const AddToHomeScreenPrompt = dynamic(
  () =>
    import("@/components/pwa/add-to-home-screen-prompt").then((m) => m.AddToHomeScreenPrompt),
  { ssr: false, loading: () => null },
);

export function PageShell({
  children,
  className,
  skipToMainLabel,
}: {
  children: React.ReactNode;
  className?: string;
  /** من الخادم — يقلّل اعتماد الغلاف على LanguageProvider */
  skipToMainLabel: string;
}) {
  return (
    <StaffAdminNavProvider>
    <AnnouncementProvider>
    <CartProvider>
      <div
        className={cn(
          "cb-storefront cb-ambient-shell cb-touch-manipulation relative z-[1] flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-hidden bg-background text-foreground",
          className,
        )}
      >
        <StorefrontRuntimeEffects />
        <div className="cb-ambient-orbs" aria-hidden />
        <a href="#main-content" className="cb-skip-link">
          {skipToMainLabel}
        </a>
        <TopAnnouncementSlot>
          <AnnouncementBar />
        </TopAnnouncementSlot>
        <StorefrontAnnouncementOverlays />

        <ResponsiveStorefrontHeader />

        <main id="main-content" className="relative flex-1">
          <div className="cb-page-route-shell min-h-0 w-full">{children}</div>
        </main>

        <div className="desktop-footer">
          <SiteFooter />
        </div>
        <MobileFooter />
        <MobileTabBar />
        <DeferredShellChrome>
          <div className="desktop-whatsapp-fab">
            <WhatsAppFab />
          </div>
          <MrBrownieHost />
          <CartDrawerGate />
          <AddToHomeScreenPrompt />
        </DeferredShellChrome>
      </div>
    </CartProvider>
    </AnnouncementProvider>
    </StaffAdminNavProvider>
  );
}
