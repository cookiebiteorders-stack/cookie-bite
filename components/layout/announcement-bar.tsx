import { Clock, Heart, Leaf, Phone, Truck } from "lucide-react";
import { ANNOUNCEMENT_ITEMS } from "@/lib/data";

const iconMap = {
  heart: Heart,
  leaf: Leaf,
  clock: Clock,
  truck: Truck,
  phone: Phone,
} as const;

export function AnnouncementBar() {
  return (
    <div className="border-b border-cb-peach-deep bg-cb-peach/60 text-cb-text-strong dark:border-cb-border/40 dark:bg-cb-peach/15 dark:text-cb-text-strong">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-1 cb-gutter py-1.5 text-[12px] font-medium sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {ANNOUNCEMENT_ITEMS.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <span
                key={item.text}
                className="inline-flex items-center gap-1.5 text-cb-text"
              >
                <Icon
                  className="h-3 w-3 shrink-0 text-cb-terracotta-dark dark:text-cb-terracotta"
                  aria-hidden
                />
                {item.text}
              </span>
            );
          })}
        </div>
        <p className="hidden text-cb-text md:block">
          Playful luxury — baked in New Cairo.
        </p>
      </div>
    </div>
  );
}
