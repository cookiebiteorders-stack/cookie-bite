"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, Maximize2 } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { CopilotChat } from "@/components/admin/copilot/copilot-chat";
import { MrsCookieAvatar } from "@/components/admin/copilot/mrs-cookie-avatar";

/**
 * Floating launcher + full-height slide-in panel for Mrs. Cookie.
 */
export function CopilotLauncher() {
  const pathname = usePathname();
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);

  const onDedicatedPage = pathname?.startsWith("/admin/copilot");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (onDedicatedPage) return null;

  const panelSide = lang === "ar" ? "left-0" : "right-0";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("copilot.openLauncher")}
        className={`group fixed bottom-5 z-40 inline-flex items-center gap-2.5 rounded-full bg-cb-surface py-1.5 shadow-lg shadow-cb-brand-logo/25 ring-1 ring-cb-border-strong transition hover:scale-105 hover:ring-cb-brand-logo active:scale-95 ${
          lang === "ar" ? "left-5 pr-1.5 pl-4" : "right-5 pl-1.5 pr-4"
        }`}
      >
        <MrsCookieAvatar size={40} />
        <span className="hidden whitespace-nowrap text-sm font-semibold text-cb-text-strong sm:inline">
          {t("copilot.askCopilot")}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50"
          dir={lang === "ar" ? "rtl" : "ltr"}
          role="dialog"
          aria-modal="true"
          aria-label={t("copilot.title")}
        >
          <button
            type="button"
            aria-label={t("copilot.close")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          />

          <aside
            className={`absolute inset-y-0 ${panelSide} flex w-full max-w-full flex-col bg-cb-surface shadow-2xl sm:max-w-[min(100vw,520px)]`}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cb-border bg-cb-surface px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div className="flex min-w-0 items-center gap-2.5">
                <MrsCookieAvatar size={36} />
                <div className="min-w-0 flex flex-col leading-tight">
                  <span className="truncate text-sm font-bold text-cb-text-strong">
                    {t("copilot.title")}
                  </span>
                  <span className="truncate text-[10px] text-cb-text-soft">
                    {t("copilot.subtitle")}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href="/admin/copilot"
                  onClick={() => setOpen(false)}
                  aria-label={t("copilot.openFullPage")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-cb-text-soft transition hover:bg-cb-peach/40 hover:text-cb-text-strong"
                >
                  <Maximize2 className="h-4 w-4" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("copilot.close")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-cb-text-soft transition hover:bg-cb-peach/40 hover:text-cb-text-strong"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col bg-cb-surface-2">
              <CopilotChat fillParent hideHeader />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
