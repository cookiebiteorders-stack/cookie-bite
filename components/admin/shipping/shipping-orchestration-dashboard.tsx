"use client";

import { useEffect } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { useShippingOrchestrationStore } from "@/stores/shipping-orchestration-store";
import { ShippingHero } from "@/components/admin/shipping/shipping-hero";
import { ShippingInsights } from "@/components/admin/shipping/shipping-insights";
import { ShippingZonesPanel } from "@/components/admin/shipping/shipping-zones-panel";
import { ShippingToasts } from "@/components/admin/shipping/shipping-toasts";
import { DeliveryZonesMap } from "@/components/admin/shipping/delivery-zones-map";

export function ShippingOrchestrationDashboard() {
  const zones = useShippingOrchestrationStore((s) => s.zones);
  const loading = useShippingOrchestrationStore((s) => s.loading);
  const error = useShippingOrchestrationStore((s) => s.error);
  const loadZones = useShippingOrchestrationStore((s) => s.loadZones);
  const online = useShippingOrchestrationStore((s) => s.online);

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void loadZones();
    });
    return cancel;
  }, [loadZones]);

  const existingNames = zones.map((z) => z.name);

  return (
    <div className="space-y-6 pb-10">
      <ShippingHero online={online && !error} />
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </p>
      ) : null}
      <ShippingInsights zones={zones} />
      <DeliveryZonesMap existingNames={existingNames} />
      <div className="space-y-4">
        {!loading && zones.length === 0 && !error ? (
          <p className="rounded-xl border border-dashed border-cb-border bg-cb-surface/40 px-4 py-3 text-sm text-stone-700">
            لا توجد مناطق شحن بعد. أضِف أول منطقة من الخريطة أعلاه، أو استورد CSV من الجدول.
          </p>
        ) : null}
        <ShippingZonesPanel />
      </div>
      <ShippingToasts />
    </div>
  );
}
