"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ENV_FREE_SHIPPING_THRESHOLD_EGP,
  type PublicCommerceSettings,
} from "@/lib/store/commerce-settings-shared";

type StoreCommerceSettingsContextValue = PublicCommerceSettings & {
  loaded: boolean;
};

const DEFAULT: StoreCommerceSettingsContextValue = {
  free_shipping_threshold_egp: ENV_FREE_SHIPPING_THRESHOLD_EGP,
  loaded: false,
};

const StoreCommerceSettingsContext =
  createContext<StoreCommerceSettingsContextValue>(DEFAULT);

export function StoreCommerceSettingsProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings?: PublicCommerceSettings;
}) {
  const [settings, setSettings] = useState<PublicCommerceSettings>(
    initialSettings ?? {
      free_shipping_threshold_egp: ENV_FREE_SHIPPING_THRESHOLD_EGP,
    },
  );
  const [loaded, setLoaded] = useState(Boolean(initialSettings));

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      fetch("/api/store/commerce-settings")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { settings?: PublicCommerceSettings } | null) => {
          if (cancelled || !data?.settings) return;
          setSettings(data.settings);
        })
        .catch(() => {
          /* keep SSR seed */
        })
        .finally(() => {
          if (!cancelled) setLoaded(true);
        });
    };

    if (initialSettings) {
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
  }, [initialSettings]);

  const value = useMemo(() => ({ ...settings, loaded }), [settings, loaded]);

  return (
    <StoreCommerceSettingsContext.Provider value={value}>
      {children}
    </StoreCommerceSettingsContext.Provider>
  );
}

export function useStoreCommerceSettings() {
  return useContext(StoreCommerceSettingsContext);
}

export function useFreeShippingThreshold(): number {
  return useStoreCommerceSettings().free_shipping_threshold_egp;
}
