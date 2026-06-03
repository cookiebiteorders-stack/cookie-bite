"use client";

import dynamic from "next/dynamic";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { AddToHomeScreenPrompt } from "@/components/pwa/add-to-home-screen-prompt";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { MobileFooter } from "@/components/layout/mobile-footer";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WhatsAppFab } from "@/components/layout/whatsapp-fab";
import { PageTransition } from "@/components/motion/page-transition";
import { CartProvider } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import { LayoutGroup } from "motion/react";

const ClientOnlyMrBrownie = dynamic(
  () => import("@/components/mr-brownie/mr-brownie-chat").then((m) => m.MrBrownieChat),
  { ssr: false },
);

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <CartProvider>
      <div
        className={cn(
          "cb-storefront cb-ambient-shell cb-touch-manipulation relative z-[1] flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-hidden bg-background text-foreground",
          className,
        )}
      >
        <div className="cb-ambient-orbs" aria-hidden />
        <a href="#main-content" className="cb-skip-link">
          {t("actions.skipToMain")}
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
        <ClientOnlyMrBrownie />

        <CartDrawer />
        <AddToHomeScreenPrompt />
      </div>
    </CartProvider>
  );
}
