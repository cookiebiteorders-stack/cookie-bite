"use client";

import { Megaphone } from "lucide-react";

type MarqueePreviewProps = {
  title: string;
  message: string;
  lang: "en" | "ar";
};

function MarqueeSegment({ label, ariaHidden }: { label: string; ariaHidden?: boolean }) {
  return (
    <div
      className="cb-announcement-marquee-segment inline-flex shrink-0 items-center"
      aria-hidden={ariaHidden || undefined}
    >
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
        <Megaphone className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
        {label}
        <span className="mx-3 opacity-60" aria-hidden>
          ·
        </span>
      </span>
    </div>
  );
}

export function AnnouncementMarqueePreview({ title, message, lang }: MarqueePreviewProps) {
  const label = message.trim() ? `${title.trim()} · ${message.trim()}` : title.trim() || "—";

  return (
    <div
      className="cb-pl-announcement overflow-hidden rounded-lg bg-cb-terracotta-dark px-2 py-1 text-white"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className="cb-announcement-marquee-viewport overflow-hidden py-0.5 text-[11px] font-medium leading-tight">
        <div className="cb-announcement-marquee flex w-max">
          <MarqueeSegment label={label} />
          <MarqueeSegment label={label} ariaHidden />
        </div>
      </div>
    </div>
  );
}
