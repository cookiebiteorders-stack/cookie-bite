"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { scrollToAccountSection } from "@/lib/account/scroll-to-section";

/** Scrolls to `#section` on `/account` after client navigation (App Router skips native hash scroll). */
export function AccountHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/account") return;

    const hash = window.location.hash;
    if (!hash) return;

    scrollToAccountSection(hash);

    const onHashChange = () => {
      if (window.location.hash) {
        scrollToAccountSection(window.location.hash);
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [pathname]);

  return null;
}
