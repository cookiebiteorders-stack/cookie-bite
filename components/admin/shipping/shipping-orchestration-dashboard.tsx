"use client";

import { useEffect } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { useShippingOrchestrationStore } from "@/stores/shipping-orchestration-store";
import { ShippingHero } from "@/components/admin/shipping/shipping-hero";
import { ShippingInsights } from "@/components/admin/shipping/shipping-insights";
import { ShippingZoneForm } from "@/components/admin/shipping/shipping-zone-form";
import { ShippingZonesPanel } from "@/components/admin/shipping/shipping-zones-panel";
import { ShippingToasts } from "@/components/admin/shipping/shipping-toasts";

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
      <ShippingInsights zones={zones} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,400px)_1fr]">
        <ShippingZoneForm existingNames={existingNames} />
        <div className="space-y-4">
          {!loading && zones.length === 0 && !error ? (
            <p className="rounded-xl border border-dashed border-cb-border bg-cb-surface/40 px-4 py-3 text-sm text-cb-text-muted">
              No shipping zones yet. Add your first zone with the form, or import a CSV.
            </p>
          ) : null}
          <ShippingZonesPanel />
        </div>
      </div>
      <ShippingToasts />
    </div>
  );
}
