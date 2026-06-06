"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PublicStoreFlags } from "@/lib/store/owner-flags";

type StoreFlagsContextValue = PublicStoreFlags & {
  loaded: boolean;
};

const FLAG_DEFAULTS: PublicStoreFlags = {
  high_contrast_mode: false,
  maintenance_mode: false,
  beta_features: false,
};

const DEFAULT: StoreFlagsContextValue = {
  ...FLAG_DEFAULTS,
  loaded: false,
};

const StoreFlagsContext = createContext<StoreFlagsContextValue>(DEFAULT);

function applyDocumentFlags(flags: PublicStoreFlags) {
  const root = document.documentElement;
  root.toggleAttribute("data-high-contrast", flags.high_contrast_mode);
  root.toggleAttribute("data-beta-features", flags.beta_features);
  root.dataset.storeFlags = JSON.stringify(flags);
}

export function StoreFlagsProvider({
  children,
  initialFlags,
}: {
  children: ReactNode;
  initialFlags?: PublicStoreFlags;
}) {
  const [flags, setFlags] = useState<PublicStoreFlags>(initialFlags ?? FLAG_DEFAULTS);
  const [loaded, setLoaded] = useState(Boolean(initialFlags));

  useEffect(() => {
    if (initialFlags) {
      applyDocumentFlags(initialFlags);
    }
  }, [initialFlags]);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      fetch("/api/store/flags")
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
    };

    if (initialFlags) {
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
  }, [initialFlags]);

  const value = useMemo(() => ({ ...flags, loaded }), [flags, loaded]);

  return <StoreFlagsContext.Provider value={value}>{children}</StoreFlagsContext.Provider>;
}

export function useStoreFlags() {
  return useContext(StoreFlagsContext);
}

export function useBetaFeaturesEnabled() {
  return useStoreFlags().beta_features;
}
