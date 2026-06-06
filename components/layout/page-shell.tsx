"use client";

import dynamic from "next/dynamic";
import { MobileFooter } from "@/components/layout/mobile-footer";
import { MobileHeader } from "@/components/layout/mobile-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CartProvider } from "@/components/providers/cart-provider";
import { StaffAdminNavProvider } from "@/components/providers/staff-admin-nav-provider";
import { cn } from "@/lib/utils";
import { LayoutGroup } from "motion/react";
import { StorefrontRuntimeEffects } from "@/components/layout/storefront-runtime-effects";

const AnnouncementBar = dynamic(
  () => import("@/components/layout/announcement-bar").then((m) => m.AnnouncementBar),
  { ssr: false, loading: () => null },
);

const CartDrawer = dynamic(
  () => import("@/components/cart/cart-drawer").then((m) => m.CartDrawer),
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

const PageTransition = dynamic(
  () => import("@/components/motion/page-transition").then((m) => m.PageTransition),
  { ssr: true },
);

const MobileTabBar = dynamic(
  () => import("@/components/layout/mobile-tab-bar").then((m) => m.MobileTabBar),
  { ssr: true },
);

const AddToHomeScreenPrompt = dynamic(
  () =>
    import("@/components/pwa/add-to-home-screen-prompt").then((m) => m.AddToHomeScreenPrompt),
  { ssr: false },
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
        <AnnouncementBar />

        <div className="desktop-header">
          <SiteHeader />
        </div>
        <div className="hidden h-16 lg:block" aria-hidden />
        <MobileHeader />

        <main id="main-content" className="relative flex-1">
          <LayoutGroup id="storefront-shared">
            <PageTransition>{children}</PageTransition>
          </LayoutGroup>
        </main>

        <div className="desktop-footer">
          <SiteFooter />
        </div>
        <MobileFooter />
        <MobileTabBar />
        <div className="desktop-whatsapp-fab">
          <WhatsAppFab />
        </div>
        <MrBrownieHost />

        <CartDrawer />
        <AddToHomeScreenPrompt />
      </div>
    </CartProvider>
    </StaffAdminNavProvider>
  );
}
