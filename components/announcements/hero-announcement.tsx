"use client";

import Link from "next/link";
import { Megaphone, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAnnouncements } from "@/components/providers/announcement-provider";
import { useAnnouncementTrack } from "@/lib/announcements/use-track";
import { cn } from "@/lib/utils";

type HeroAnnouncementProps = {
  className?: string;
  /** inline = داخل عمود النص (موبايل)، panel = العمود الجانبي (ديسكتوب) */
  variant?: "inline" | "panel";
};

export function HeroAnnouncement({ className, variant = "inline" }: HeroAnnouncementProps) {
  const pathname = usePathname();
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
    }, 9000);
    return () => window.clearInterval(timer);
  }, [visible.length]);

  // على الرئيسية: الإعلانات تظهر في الشريط المتحرك العلوي
  if (pathname === "/") return null;
  if (!loaded || !current) return null;

  const onDismiss = () => {
    setDismissed((prev) => new Set(prev).add(current.id));
    void track(current.id, "dismiss", { variantKey: current.abVariantKey });
  };

  const isPanel = variant === "panel";

  return (
    <aside
      className={cn(
        "cb-hero-announcement",
        isPanel && "cb-hero-announcement--panel",
        !isPanel && "cb-hero-announcement--inline",
        className,
      )}
      role="region"
      aria-label={current.title}
    >
      <div className="cb-hero-announcement__card">
        <div className="cb-hero-announcement__icon" aria-hidden>
          <Megaphone className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="cb-hero-announcement__title">{current.title}</p>
          {current.message ? (
            <p className="cb-hero-announcement__message">{current.message}</p>
          ) : null}

          <div className="cb-hero-announcement__actions">
            {current.cta ? (
              <Link
                href={current.cta.url}
                className="cb-hero-announcement__cta"
                onClick={() =>
                  void track(current.id, "click", { variantKey: current.abVariantKey })
                }
              >
                {current.cta.label}
              </Link>
            ) : null}

            {visible.length > 1 ? (
              <div className="cb-hero-announcement__dots" aria-hidden>
                {visible.map((item, i) => (
                  <span
                    key={item.id}
                    className={cn(
                      "cb-hero-announcement__dot",
                      i === index % visible.length && "is-active",
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {current.dismissible ? (
          <button
            type="button"
            className="cb-hero-announcement__dismiss"
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </aside>
  );
}
