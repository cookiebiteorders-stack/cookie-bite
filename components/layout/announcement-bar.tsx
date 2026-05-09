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
  const tickerItems = ANNOUNCEMENT_ITEMS.filter((item) => item.icon !== "truck");

  return (
    <div className="border-b border-cb-peach-deep bg-cb-peach/60 text-cb-text-strong dark:border-cb-border/40 dark:bg-cb-peach/15 dark:text-cb-text-strong">
      <div className="mx-auto max-w-7xl cb-gutter py-1.5 text-[12px] font-medium">
        <div className="scrollbar-hide overflow-hidden whitespace-nowrap">
          <div className="inline-flex min-w-max items-center gap-8 pr-8 [animation:cb-marquee_26s_linear_infinite]">
            {[...tickerItems, ...tickerItems].map((item, index) => {
              const Icon = iconMap[item.icon];
              return (
                <span
                  key={`${item.text}-${index}`}
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
        </div>
      </div>
    </div>
  );
}
