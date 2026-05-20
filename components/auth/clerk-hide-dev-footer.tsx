"use client";

import { useEffect } from "react";

const ROOT_ID = "main-auth";

/** عناصر تفاعلية لنموذج Clerk — لا نخفي أي حاوية تحتويها */
function containsAuthFormControls(el: HTMLElement): boolean {
  return Boolean(
    el.querySelector(
      [
        'input:not([type="hidden"])',
        'button[type="submit"]',
        'button[type="button"]',
        "iframe",
        '[class*="cl-socialButtons"]',
        '[class*="cl-formButton"]',
        '[class*="cl-formField"]',
      ].join(", "),
    ),
  );
}

/**
 * يخفي شريط Clerk «Secured by / Development mode» فقط — لا يمسّ بطاقة النموذج.
 * النسخة السابقة كانت تخفي `div` أب يحتوي النموذج بالكامل عندما يتأخر تحميل الحقول.
 */
function suppressClerkDevChrome(root: HTMLElement) {
  root.querySelectorAll<HTMLAnchorElement>('a[href*="clerk.com"]').forEach((a) => {
    const row =
      a.closest<HTMLElement>(
        '[class*="cl-footer"], [class*="cl-internal"], footer, p, span, div',
      ) ?? a.parentElement;
    if (!row || row.getAttribute("data-cb-clerk-dev-hidden") === "1") return;
    if (containsAuthFormControls(row)) return;

    const text = (row.textContent ?? "").replace(/\s+/g, " ").trim();
    const looksLikeDevFooter =
      /Secured/i.test(text) &&
      (/Development mode/i.test(text) || /clerk/i.test(text)) &&
      text.length < 220;

    if (!looksLikeDevFooter) return;
    if (row.offsetHeight > 80) return;

    row.style.setProperty("display", "none", "important");
    row.setAttribute("data-cb-clerk-dev-hidden", "1");
  });
}

export function ClerkHideDevFooter() {
  useEffect(() => {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => suppressClerkDevChrome(root as HTMLElement), 120);
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
