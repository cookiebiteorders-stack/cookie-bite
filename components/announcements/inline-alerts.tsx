"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAnnouncements } from "@/components/providers/announcement-provider";
import { useAnnouncementTrack } from "@/lib/announcements/use-track";
import { cn } from "@/lib/utils";
import type { InlineVariant } from "@/lib/announcements/types";

const variantStyles: Record<
  InlineVariant,
  { icon: typeof Info; className: string }
> = {
  info: { icon: Info, className: "border-sky-300/60 bg-sky-50 text-sky-950 dark:bg-sky-950/30 dark:text-sky-100" },
  success: {
    icon: CheckCircle2,
    className: "border-emerald-300/60 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-amber-300/60 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100",
  },
  error: {
    icon: AlertCircle,
    className: "border-rose-300/60 bg-rose-50 text-rose-950 dark:bg-rose-950/30 dark:text-rose-100",
  },
};

export function InlineAlerts({ slot }: { slot?: string }) {
  const { getByType, loaded } = useAnnouncements();
  const { track } = useAnnouncementTrack();
  const alerts = useMemo(() => getByType("inline"), [getByType]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.id));

  useEffect(() => {
    visible.forEach((alert) => {
      void track(alert.id, "impression", {
        perSession: alert.frequency.perSession,
        variantKey: alert.abVariantKey,
      });
    });
  }, [visible, track]);

  if (!loaded || !visible.length) return null;

  return (
    <div className={cn("space-y-2", slot === "cart" && "mb-4")} data-announcement-slot={slot}>
      {visible.map((alert) => {
        const variant = alert.variant ?? "info";
        const style = variantStyles[variant];
        const Icon = style.icon;
        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
              style.className,
            )}
            role="status"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              {alert.title ? (
                <p className="font-semibold">{alert.title}</p>
              ) : null}
              <p className={alert.title ? "mt-0.5 opacity-90" : ""}>{alert.message}</p>
              {alert.cta ? (
                <Link
                  href={alert.cta.url}
                  className="mt-2 inline-block text-xs font-semibold underline-offset-2 hover:underline"
                  onClick={() => void track(alert.id, "click", { variantKey: alert.abVariantKey })}
                >
                  {alert.cta.label}
                </Link>
              ) : null}
            </div>
            {alert.dismissible ? (
              <button
                type="button"
                className="shrink-0 rounded-full p-1 hover:bg-black/5"
                aria-label="Dismiss"
                onClick={() => {
                  setDismissed((s) => new Set(s).add(alert.id));
                  void track(alert.id, "dismiss", { variantKey: alert.abVariantKey });
                }}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
