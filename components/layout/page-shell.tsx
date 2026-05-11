"use client";

import { useEffect, useState } from "react";
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
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import { LayoutGroup } from "motion/react";

/** يمنع ترطيب مكوّنات تعتمد على viewport/storage من أن تُصدَّر في HTML الخادم */
function ClientOnlyMrBrownie() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  if (!ready) return null;
  return <MrBrownieChat />;
}

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
          "cb-ambient-shell cb-touch-manipulation relative z-[1] flex min-h-screen flex-col overflow-x-clip bg-background text-foreground",
          className,
        )}
      >
        <div className="cb-ambient-orbs" aria-hidden />
        <a href="#main-content" className="cb-skip-link">
          {t("actions.skipToMain")}
        </a>
        <AnnouncementBar />

        {/* Desktop header */}
        <div className="desktop-header">
          <SiteHeader />
        </div>
        <div className="hidden h-16 lg:block" aria-hidden />

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
        <ClientOnlyMrBrownie />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
