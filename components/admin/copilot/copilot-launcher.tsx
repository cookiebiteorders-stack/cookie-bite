"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, Maximize2 } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { CopilotChat } from "@/components/admin/copilot/copilot-chat";
import { MrsCookieAvatar } from "@/components/admin/copilot/mrs-cookie-avatar";

/**
 * Floating launcher button (bottom-right) + slide-in drawer with the chat.
 * Mounted by `AdminShell` so it's available on every /admin/* page.
 * Hidden automatically on the dedicated `/admin/copilot` page (to avoid
 * duplicating the same UI side-by-side).
 */
export function CopilotLauncher() {
  const pathname = usePathname();
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);

  // Hide on the full-page copilot route.
  const onDedicatedPage = pathname?.startsWith("/admin/copilot");

  // Close drawer when route changes (so it doesn't linger between pages).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (onDedicatedPage) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("copilot.openLauncher")}
        className={`group fixed bottom-5 ${
          lang === "ar" ? "left-5" : "right-5"
        } z-40 inline-flex items-center gap-2.5 rounded-full bg-cb-surface py-1.5 ${
          lang === "ar" ? "pr-1.5 pl-4" : "pl-1.5 pr-4"
        } text-sm font-semibold text-cb-text-strong shadow-lg shadow-cb-brand-logo/25 ring-1 ring-cb-border-strong transition hover:scale-105 hover:ring-cb-brand-logo active:scale-95`}
      >
        <MrsCookieAvatar size={40} />
        <span className="hidden whitespace-nowrap sm:inline">
          {t("copilot.askCopilot")}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex"
          dir={lang === "ar" ? "rtl" : "ltr"}
          role="dialog"
          aria-modal="true"
          aria-label={t("copilot.title")}
        >
          <button
            type="button"
            aria-label={t("copilot.close")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            tabIndex={-1}
          />
          <div
            className={`relative ${
              lang === "ar" ? "mr-auto" : "ml-auto"
            } flex h-full w-full max-w-[440px] flex-col bg-cb-surface-2 shadow-2xl`}
          >
            <div className="flex items-center justify-between border-b border-cb-border bg-cb-surface px-4 py-3">
              <div className="flex items-center gap-2.5">
                <MrsCookieAvatar size={32} />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-cb-text-strong">
                    {t("copilot.title")}
                  </span>
                  <span className="text-[10px] text-cb-text-soft">
                    {t("copilot.subtitle")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href="/admin/copilot"
                  onClick={() => setOpen(false)}
                  aria-label={t("copilot.openFullPage")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-cb-text-soft transition hover:bg-cb-peach/40 hover:text-cb-text-strong"
                >
                  <Maximize2 className="h-4 w-4" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("copilot.close")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-cb-text-soft transition hover:bg-cb-peach/40 hover:text-cb-text-strong"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-3">
              <CopilotChat />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
