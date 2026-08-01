"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string };

type Props = {
  links: NavLink[];
  lang: string;
  menuLabel: string;
  closeLabel: string;
  onClose: () => void;
};

/** قائمة الموبايل — CSS فقط (بدون motion)؛ تُحمَّل عند الفتح فقط. */
export function MobileHeaderNavDrawer({
  links,
  lang,
  menuLabel,
  closeLabel,
  onClose,
}: Props) {
  const rtl = lang === "ar";

  return (
    <div
      id="site-mobile-nav"
      role="dialog"
      aria-modal="true"
      className="mobile-nav-drawer fixed inset-0 z-[120] md:hidden"
    >
      <button
        type="button"
        className="mobile-nav-drawer__overlay absolute inset-0 bg-black/55"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <nav
        className={cn(
          "mobile-nav-drawer__panel absolute inset-y-0 flex w-[min(88vw,340px)] flex-col border-e border-cb-border bg-cb-surface p-4 pt-6",
          rtl ? "end-0 border-e-0 border-s" : "start-0",
        )}
      >
        <div className="mb-4 flex items-center justify-between border-b border-cb-border pb-4">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-cb-text-muted">
            {menuLabel}
          </span>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-cb-peach/45 transition-colors"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <X className="h-5 w-5 text-cb-text-strong" aria-hidden />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-4 py-3.5 text-base font-semibold text-cb-text-strong hover:bg-cb-peach/45 transition-colors active:bg-cb-peach/60"
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
