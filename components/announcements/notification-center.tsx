"use client";

import Link from "next/link";
import { Bell, Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAnnouncements } from "@/components/providers/announcement-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { useAnnouncementTrack } from "@/lib/announcements/use-track";
import { cn } from "@/lib/utils";

export function NotificationCenter({ className }: { className?: string }) {
  const { getByType, loaded } = useAnnouncements();
  const { track } = useAnnouncementTrack();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "system" | "notification">("all");
  const panelRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    const notifications = getByType("notification");
    const system = getByType("system");
    const merged = [...notifications, ...system].sort((a, b) => b.priority - a.priority);
    if (filter === "notification") return notifications;
    if (filter === "system") return system;
    return merged;
  }, [getByType, filter]);

  const unreadCount = items.filter((i) => !readIds.has(i.id)).length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const markRead = (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
    void track(id, "impression", { perSession: false });
  };

  const markAllRead = () => {
    items.forEach((item) => markRead(item.id));
  };

  if (!loaded) return null;

  return (
    <div className={cn("relative", className)} ref={panelRef}>
      <button
        type="button"
        className="cb-touch-manipulation relative inline-flex h-11 min-h-[2.75rem] w-11 min-w-[2.75rem] items-center justify-center rounded-xl text-cb-text transition hover:bg-cb-hover-overlay"
        aria-label={t("announcements.notifications")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute end-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cb-terracotta-dark px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute end-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-cb-border/60 bg-cb-surface shadow-xl",
            "max-md:fixed max-md:end-4 max-md:start-4 max-md:top-auto max-md:bottom-[calc(5rem+env(safe-area-inset-bottom))]",
          )}
        >
          <div className="flex items-center justify-between border-b border-cb-border/50 px-4 py-3">
            <h3 className="text-sm font-semibold">{t("announcements.notifications")}</h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-medium hover:bg-cb-hover-overlay"
                onClick={markAllRead}
              >
                <Check className="me-1 inline h-3.5 w-3.5" aria-hidden />
                {t("announcements.markAllRead")}
              </button>
              <button
                type="button"
                className="rounded-lg p-1 hover:bg-cb-hover-overlay"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="flex gap-1 border-b border-cb-border/40 px-3 py-2">
            {(["all", "notification", "system"] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  filter === key
                    ? "bg-cb-terracotta-dark text-white"
                    : "text-cb-text hover:bg-cb-hover-overlay",
                )}
                onClick={() => setFilter(key)}
              >
                {t(`announcements.filter.${key}`)}
              </button>
            ))}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-cb-text-muted">
                {t("announcements.empty")}
              </li>
            ) : (
              items.map((item) => {
                const unread = !readIds.has(item.id);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "border-b border-cb-border/30 px-4 py-3 last:border-0",
                      unread && "bg-cb-peach/15",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-cb-text-strong">{item.title}</p>
                        <p className="mt-0.5 text-xs text-cb-text">{item.message}</p>
                        {item.cta ? (
                          <Link
                            href={item.cta.url}
                            className="mt-2 inline-block text-xs font-semibold text-cb-terracotta-dark no-underline hover:underline"
                            onClick={() => {
                              markRead(item.id);
                              void track(item.id, "click", { variantKey: item.abVariantKey });
                              setOpen(false);
                            }}
                          >
                            {item.cta.label}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className="mt-2 text-xs font-medium text-cb-terracotta-dark"
                            onClick={() => markRead(item.id)}
                          >
                            {t("announcements.markRead")}
                          </button>
                        )}
                      </div>
                      {unread ? (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cb-terracotta-dark" />
                      ) : null}
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          <div className="border-t border-cb-border/50 px-4 py-2 text-center">
            <Link
              href="/updates"
              className="text-xs font-semibold text-cb-terracotta-dark no-underline hover:underline"
              onClick={() => setOpen(false)}
            >
              {t("announcements.viewAll")}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
