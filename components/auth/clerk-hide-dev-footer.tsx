"use client";

import { useEffect } from "react";

const ROOT_ID = "main-auth";

/**
 * يخفي شريط Clerk «Secured by / Development mode» داخل `#main-auth` عندما لا يُطبَّق
 * `appearance.layout.unsafe_disableDevelopmentModeWarnings` (إصدارات أو ترتيب دمج).
 */
function suppressClerkDevChrome(root: HTMLElement) {
  root.querySelectorAll<HTMLAnchorElement>('a[href*="clerk.com"]').forEach((a) => {
    let el: HTMLElement | null = a;
    for (let d = 0; d < 12 && el; d++) {
      const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (
        t.includes("Development mode") &&
        (t.includes("Secured") || /clerk/i.test(t)) &&
        t.length < 200
      ) {
        el.style.setProperty("display", "none", "important");
        el.setAttribute("data-cb-clerk-dev-hidden", "1");
        break;
      }
      el = el.parentElement;
    }
  });

  root.querySelectorAll<HTMLElement>("div,footer,aside,section").forEach((el) => {
    if (el.querySelector("a[href*='clerk.com']")) return;
    const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (
      t.includes("Development mode") &&
      t.includes("Secured") &&
      t.length < 200 &&
      el.offsetHeight < 140
    ) {
      el.style.setProperty("display", "none", "important");
      el.setAttribute("data-cb-clerk-dev-hidden", "1");
    }
  });
}

export function ClerkHideDevFooter() {
  useEffect(() => {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => suppressClerkDevChrome(root as HTMLElement), 60);
    };

    schedule();
    const mo = new MutationObserver(schedule);
    mo.observe(root, { subtree: true, childList: true });
    return () => {
      mo.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return null;
}
