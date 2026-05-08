"use client";

import { LayoutProvider } from "@/context/layout-context";
import { Navbar } from "@/components/layout/responsive/navbar";
import { MobileDrawer } from "@/components/layout/responsive/mobile-drawer";
import { Sidebar } from "@/components/layout/responsive/sidebar";
import { MainContent } from "@/components/layout/responsive/main-content";
import { CommandPalette } from "@/components/layout/responsive/command-palette";
import { CartDrawer } from "@/src/components/cart/CartDrawer";
import { ToastViewport } from "@/src/components/ui/Toast";
import { CartProvider } from "@/components/providers/cart-provider";

export function ResponsiveShell({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <CartProvider>
        <div className="font-layout-body flex min-h-screen flex-col bg-background text-foreground">
          <Navbar />
          <MobileDrawer />
          <CommandPalette />
          <CartDrawer />
          <ToastViewport />
          <div className="flex min-h-[calc(100vh-4rem)]">
            <Sidebar />
            <MainContent>{children}</MainContent>
          </div>
        </div>
      </CartProvider>
    </LayoutProvider>
  );
}

