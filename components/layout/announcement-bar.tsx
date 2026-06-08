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

/** تكرار كافٍ لملء الشاشات العريضة بدون فراغات أثناء الحلقة */
const MARQUEE_COPIES = 8;

type TickerItem = {
  icon: keyof typeof iconMap;
  label: string;
};

function MarqueeSegment({
  items,
  ariaHidden,
}: {
  items: TickerItem[];
  ariaHidden?: boolean;
}) {
  return (
    <div
      className="cb-announcement-marquee-segment inline-flex shrink-0 items-center"
      aria-hidden={ariaHidden || undefined}
    >
      {items.map((item, index) => {
        const Icon = iconMap[item.icon];
        return (
          <span
            key={`${item.label}-${index}`}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"
          >
            <Icon className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
            {item.label}
            <span className="mx-3 opacity-60" aria-hidden>
              ·
            </span>
          </span>
        );
      })}
    </div>
  );
}

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

  const loopItems = useMemo(
    () => Array.from({ length: MARQUEE_COPIES }, () => tickerItems).flat(),
    [tickerItems],
  );

  return (
    <div className="cb-pl-announcement">
      <div className="cb-announcement-marquee-viewport overflow-hidden py-0.5 text-[11px] font-medium leading-tight">
        <div className="cb-announcement-marquee flex w-max">
          <MarqueeSegment items={loopItems} />
          <MarqueeSegment items={loopItems} ariaHidden />
        </div>
      </div>
    </div>
  );
}
