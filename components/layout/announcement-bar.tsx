"use client";

import { Clock, Heart, Leaf, Megaphone, Phone, Truck } from "lucide-react";
import { useMemo } from "react";
import { useAnnouncements } from "@/components/providers/announcement-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { useFreeShippingThreshold } from "@/components/providers/store-commerce-settings-provider";
import { BRAND } from "@/lib/brand";

const iconMap = {
  heart: Heart,
  leaf: Leaf,
  clock: Clock,
  truck: Truck,
  phone: Phone,
  megaphone: Megaphone,
} as const;

type TickerItem = {
  icon: keyof typeof iconMap;
  label: string;
};

export function AnnouncementBar() {
  const { t } = useLanguage();
  const freeShippingThreshold = useFreeShippingThreshold();
  const { getByType, loaded } = useAnnouncements();

  const tickerItems = useMemo(() => {
    const base: TickerItem[] = [
      {
        icon: "truck",
        label: t("announcement.freeDelivery", { threshold: freeShippingThreshold }),
      },
      { icon: "clock", label: t("announcement.freshBaked") },
      { icon: "heart", label: t("announcement.giftWrapping") },
      { icon: "leaf", label: t("announcement.naturalIngredients") },
      { icon: "phone", label: t("announcement.whatsapp", { phone: BRAND.phoneDisplay }) },
    ];

    if (!loaded) return base;

    const dynamic = getByType("banner").map((item) => ({
      icon: "megaphone" as const,
      label: item.message ? `${item.title} · ${item.message}` : item.title,
    }));

    return dynamic.length ? [...dynamic, ...base] : base;
  }, [t, freeShippingThreshold, getByType, loaded]);

  return (
    <div className="cb-pl-announcement">
      <div className="mx-auto max-w-7xl cb-gutter py-1.5 text-[12px] font-medium">
        <div className="scrollbar-hide overflow-hidden whitespace-nowrap">
          <div className="cb-announcement-marquee inline-flex min-w-max items-center gap-8 pe-8">
            {[...tickerItems, ...tickerItems].map((item, index) => {
              const Icon = iconMap[item.icon];
              return (
                <span
                  key={`${item.label}-${index}`}
                  className="inline-flex items-center gap-1.5"
                >
                  {index > 0 ? (
                    <span className="mx-2 opacity-60" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <Icon className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                  {item.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
