"use client";

import { Clock, Heart, Leaf, Phone, Truck } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { BRAND } from "@/lib/brand";
import { ANNOUNCEMENT_ITEMS } from "@/lib/data";

const iconMap = {
  heart: Heart,
  leaf: Leaf,
  clock: Clock,
  truck: Truck,
  phone: Phone,
} as const;

export function AnnouncementBar() {
  const { t } = useLanguage();
  const tickerItems = ANNOUNCEMENT_ITEMS.filter((item) => item.icon !== "truck");

  return (
    <div className="cb-pl-announcement">
      <div className="mx-auto max-w-7xl cb-gutter py-1.5 text-[12px] font-medium">
        <div className="scrollbar-hide overflow-hidden whitespace-nowrap">
          <div className="inline-flex min-w-max items-center gap-8 pr-8 [animation:cb-marquee_26s_linear_infinite]">
            {[...tickerItems, ...tickerItems].map((item, index) => {
              const Icon = iconMap[item.icon];
              const label =
                item.icon === "clock"
                  ? t("announcement.freshBaked")
                  : item.icon === "heart"
                    ? t("announcement.giftWrapping")
                    : item.icon === "leaf"
                      ? t("announcement.naturalIngredients")
                      : item.icon === "phone"
                        ? t("announcement.whatsapp", {
                            phone: BRAND.phoneDisplay,
                          })
                        : "";
              return (
                <span
                  key={`${item.text}-${index}`}
                  className="inline-flex items-center gap-1.5"
                >
                  {index > 0 ? (
                    <span className="mx-2 text-cb-terracotta-dark/60" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <Icon
                    className="h-3 w-3 shrink-0 text-cb-terracotta-dark dark:text-cb-terracotta"
                    aria-hidden
                  />
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
