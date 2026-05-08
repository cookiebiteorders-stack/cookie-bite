"use client";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WhatsAppFab } from "@/components/layout/whatsapp-fab";
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
        <SiteHeader />
        <main id="main-content" className="relative flex-1">
          <LayoutGroup id="storefront-shared">
            <PageTransition>{children}</PageTransition>
          </LayoutGroup>
        </main>
        <SiteFooter />
        <WhatsAppFab />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
