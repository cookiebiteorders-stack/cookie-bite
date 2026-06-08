"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLanguage } from "@/components/providers/language-provider";
import {
  businessHoursForLang,
  type PublicBusinessSettings,
} from "@/lib/store/business-settings-shared";

type StoreBusinessSettingsContextValue = PublicBusinessSettings & {
  loaded: boolean;
};

const DEFAULT: StoreBusinessSettingsContextValue = {
  hours_en: "",
  hours_ar: "",
  loaded: false,
};

const StoreBusinessSettingsContext =
  createContext<StoreBusinessSettingsContextValue>(DEFAULT);

export function StoreBusinessSettingsProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings?: PublicBusinessSettings;
}) {
  const [settings, setSettings] = useState<PublicBusinessSettings>(
    initialSettings ?? { hours_en: "", hours_ar: "" },
  );
  const [loaded, setLoaded] = useState(Boolean(initialSettings));

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      fetch("/api/store/business-settings")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { settings?: PublicBusinessSettings } | null) => {
          if (cancelled || !data?.settings) return;
          setSettings(data.settings);
        })
        .catch(() => {
          /* keep defaults / SSR seed */
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

  const value = useMemo(
    () => ({ ...settings, loaded }),
    [settings, loaded],
  );

  return (
    <StoreBusinessSettingsContext.Provider value={value}>
      {children}
    </StoreBusinessSettingsContext.Provider>
  );
}

export function useStoreBusinessSettings() {
  return useContext(StoreBusinessSettingsContext);
}

/** Work hours label for the active storefront language, with translation fallback. */
export function useBusinessHours(): string {
  const { lang, t } = useLanguage();
  const settings = useStoreBusinessSettings();
  const fromDb = businessHoursForLang(settings, lang).trim();
  if (fromDb) return fromDb;
  return t("footer.hoursLine");
}
