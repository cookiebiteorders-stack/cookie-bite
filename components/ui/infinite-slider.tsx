"use client";

import { cn } from "@/lib/utils";

type InfiniteSliderProps = {
  children: React.ReactNode;
  gap?: number;
  /** مدة دورة كاملة بالثواني (أصغر = أسرع) */
  durationSec?: number;
  className?: string;
};

/** شريط شعارات بسيط بدون اعتمادات إضافية (متوافق مع Tailwind). */
export function InfiniteSlider({
  children,
  gap = 48,
  durationSec = 45,
  className,
}: InfiniteSliderProps) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <div
        className="flex w-max flex-row motion-reduce:animate-none"
        style={{
          gap: `${gap}px`,
          animation: `cb-marquee ${durationSec}s linear infinite`,
        }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
