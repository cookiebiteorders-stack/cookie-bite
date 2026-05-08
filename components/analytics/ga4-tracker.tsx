"use client";

import Script from "next/script";
import { useEffect } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GA4Tracker() {
  useEffect(() => {
    if (!GA_ID || typeof window === "undefined") return;

    const marks = new Set<number>();

    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const scrollPct = Math.round((window.scrollY / scrollable) * 100);
      for (const mark of [25, 50, 75, 90]) {
        if (scrollPct >= mark && !marks.has(mark)) {
          marks.add(mark);
          window.gtag?.("event", "scroll", { percent_scrolled: mark });
        }
      }
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a[href^='http']") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.href;
      if (!href.startsWith(window.location.origin)) {
        window.gtag?.("event", "click", {
          event_category: "outbound",
          event_label: href,
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
    };
  }, []);

  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
            send_page_view: true
          });
        `}
      </Script>
    </>
  );
}

