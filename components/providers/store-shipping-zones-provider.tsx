"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PublicShippingZone } from "@/lib/shipping/public-zones-shared";

type StoreShippingZonesContextValue = {
  zones: PublicShippingZone[];
  loaded: boolean;
};

const DEFAULT: StoreShippingZonesContextValue = {
  zones: [],
  loaded: false,
};

const StoreShippingZonesContext = createContext<StoreShippingZonesContextValue>(DEFAULT);

export function StoreShippingZonesProvider({
  children,
  initialZones,
}: {
  children: ReactNode;
  initialZones?: PublicShippingZone[];
}) {
  const [zones, setZones] = useState<PublicShippingZone[]>(initialZones ?? []);
  const [loaded, setLoaded] = useState(Boolean(initialZones));

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      fetch("/api/store/shipping-zones")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { zones?: PublicShippingZone[] } | null) => {
          if (cancelled || !data?.zones) return;
          setZones(data.zones);
        })
        .catch(() => {
          /* keep SSR seed */
        })
        .finally(() => {
          if (!cancelled) setLoaded(true);
        });
    };

    if (initialZones) {
      setLoaded(true);
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(refresh, { timeout: 45_000 });
        return () => {
          cancelled = true;
          window.cancelIdleCallback(id);
        };
      }
      const timer = window.setTimeout(refresh, 12_000);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }

    refresh();
    return () => {
      cancelled = true;
    };
  }, [initialZones]);

  const value = useMemo(() => ({ zones, loaded }), [zones, loaded]);

  return (
    <StoreShippingZonesContext.Provider value={value}>
      {children}
    </StoreShippingZonesContext.Provider>
  );
}

export function useStoreShippingZones() {
  return useContext(StoreShippingZonesContext);
}
