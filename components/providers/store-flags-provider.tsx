"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PublicStoreFlags } from "@/lib/store/owner-flags";

type StoreFlagsContextValue = PublicStoreFlags & {
  loaded: boolean;
};

const DEFAULT: StoreFlagsContextValue = {
  high_contrast_mode: false,
  maintenance_mode: false,
  beta_features: false,
  loaded: false,
};

const StoreFlagsContext = createContext<StoreFlagsContextValue>(DEFAULT);

function applyDocumentFlags(flags: PublicStoreFlags) {
  const root = document.documentElement;
  root.toggleAttribute("data-high-contrast", flags.high_contrast_mode);
  root.toggleAttribute("data-beta-features", flags.beta_features);
  root.dataset.storeFlags = JSON.stringify(flags);
}

export function StoreFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<PublicStoreFlags>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/store/flags", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { flags?: PublicStoreFlags } | null) => {
        if (cancelled || !data?.flags) return;
        setFlags(data.flags);
        applyDocumentFlags(data.flags);
      })
      .catch(() => {
        /* keep defaults */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ ...flags, loaded }), [flags, loaded]);

  return <StoreFlagsContext.Provider value={value}>{value}</StoreFlagsContext.Provider>;
}

export function useStoreFlags() {
  return useContext(StoreFlagsContext);
}

export function useBetaFeaturesEnabled() {
  return useStoreFlags().beta_features;
}
