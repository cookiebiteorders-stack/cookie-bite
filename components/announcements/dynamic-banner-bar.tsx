"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAnnouncements } from "@/components/providers/announcement-provider";
import { useAnnouncementTrack } from "@/lib/announcements/use-track";

export function DynamicBannerBar() {
  const { getByType, loaded } = useAnnouncements();
  const { track } = useAnnouncementTrack();
  const banners = useMemo(() => getByType("banner"), [getByType]);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = banners.filter((b) => !dismissed.has(b.id));
  const current = visible[index % Math.max(visible.length, 1)];

  useEffect(() => {
    if (!current) return;
    void track(current.id, "impression", {
      perSession: current.frequency.perSession,
      variantKey: current.abVariantKey,
    });
  }, [current, track]);

  useEffect(() => {
    if (visible.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % visible.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [visible.length]);

  if (!loaded || !current) return null;

  const onDismiss = () => {
    setDismissed((prev) => new Set(prev).add(current.id));
    void track(current.id, "dismiss", { variantKey: current.abVariantKey });
  };

  return (
    <div className="cb-pl-announcement" role="region" aria-label={current.title}>
      <div className="mx-auto flex max-w-7xl items-center gap-2 cb-gutter py-1.5 text-[12px] font-medium">
        <p className="min-w-0 flex-1 truncate">
          <span className="font-semibold">{current.title}</span>
          {current.message ? (
            <span className="opacity-90"> — {current.message}</span>
          ) : null}
        </p>
        {current.cta ? (
          <Link
            href={current.cta.url}
            className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold no-underline transition hover:bg-white/30"
            onClick={() => void track(current.id, "click", { variantKey: current.abVariantKey })}
          >
            {current.cta.label}
          </Link>
        ) : null}
        {current.dismissible ? (
          <button
            type="button"
            className="cb-touch-manipulation inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
