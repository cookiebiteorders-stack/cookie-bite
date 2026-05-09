"use client";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { MobileFooter } from "@/components/layout/mobile-footer";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WhatsAppFab } from "@/components/layout/whatsapp-fab";
import { MrBrownieChat } from "@/components/mr-brownie/mr-brownie-chat";
import { PageTransition } from "@/components/motion/page-transition";
import { CartProvider } from "@/components/providers/cart-provider";
import { LayoutGroup } from "motion/react";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="cb-ambient-shell cb-touch-manipulation relative z-[1] flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
        <div className="cb-ambient-orbs" aria-hidden />
        <a href="#main-content" className="cb-skip-link">
          Skip to main content
        </a>
        <AnnouncementBar />

        {/* Desktop header */}
        <div className="desktop-header">
          <SiteHeader />
        </div>

        {/* Mobile header */}
        <MobileHeader />

        <main id="main-content" className="relative flex-1">
          <LayoutGroup id="storefront-shared">
            <PageTransition>{children}</PageTransition>
          </LayoutGroup>
        </main>

        {/* Desktop footer */}
        <div className="desktop-footer">
          <SiteFooter />
        </div>

        {/* Mobile footer + tab bar */}
        <MobileFooter />
        <MobileTabBar />

        <div className="desktop-whatsapp-fab">
          <WhatsAppFab />
        </div>
        <MrBrownieChat />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
