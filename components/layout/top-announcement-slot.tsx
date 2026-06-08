"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * يثبّت شريط الإعلانات فوق الهيدر ويضبط `--cb-announcement-offset` لارتفاع الشريط.
 */
export function TopAnnouncementSlot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      const height = ref.current?.offsetHeight ?? 0;
      root.style.setProperty("--cb-announcement-offset", `${height}px`);
      if (height > 0) {
        root.setAttribute("data-top-announcement", "true");
      } else {
        root.removeAttribute("data-top-announcement");
      }
    };

    sync();

    const node = ref.current;
    if (!node) return;

    const observer = new ResizeObserver(sync);
    observer.observe(node);

    const mutationObserver = new MutationObserver(sync);
    mutationObserver.observe(node, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      root.style.setProperty("--cb-announcement-offset", "0px");
      root.removeAttribute("data-top-announcement");
    };
  }, [children]);

  return (
    <div
      ref={ref}
      className="cb-top-announcement-slot fixed inset-x-0 top-0 z-[105] w-full"
      aria-live="polite"
    >
      {children}
    </div>
  );
}
