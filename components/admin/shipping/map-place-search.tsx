"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Navigation, Search, X } from "lucide-react";
import {
  mergeMapSearch,
  type MapSearchResult,
} from "@/lib/map/geocode-search";
import type { ShippingZoneRow } from "@/lib/shipping/types";
import type { ZoneGeo } from "@/lib/shipping/zone-geo";
import { cn } from "@/lib/utils";

type Props = {
  zones: ShippingZoneRow[];
  geoStore: Record<string, ZoneGeo>;
  onSelectPlace: (result: MapSearchResult) => void;
  onSelectZone: (zone: ShippingZoneRow) => void;
  className?: string;
};

export function MapPlaceSearch({
  zones,
  geoStore,
  onSelectPlace,
  onSelectZone,
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setResults([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const merged = await mergeMapSearch(zones, geoStore, trimmed);
        setResults(merged);
        if (merged.length === 0) {
          setError("لا توجد نتائج — جرّب اسم منطقة أو مدينة أو حي");
        }
      } catch {
        setError("تعذّر البحث — تحقق من الاتصال");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [zones, geoStore],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setOpen(true);
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (item: MapSearchResult) => {
    if (item.kind === "zone" && item.zoneId) {
      const zone = zones.find((z) => z.id === item.zoneId);
      if (zone) onSelectZone(zone);
    } else {
      onSelectPlace(item);
    }
    setQuery(item.label);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <label className="sr-only" htmlFor="map-place-search">
        بحث عن منطقة أو مكان على الخريطة
      </label>
      <div className="flex items-center gap-2 rounded-2xl border border-cb-border bg-cb-surface px-3 py-2 shadow-sm ring-1 ring-black/5">
        <Search className="h-4 w-4 shrink-0 text-cb-text-muted" aria-hidden />
        <input
          id="map-place-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
          placeholder="ابحث: حي، مدينة، منطقة توصيل… (مثال: التجمع، الزمالك، مدينة نصر)"
          className="min-w-0 flex-1 bg-transparent text-sm text-cb-text-strong outline-none placeholder:text-cb-text-muted"
          autoComplete="off"
        />
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-600" aria-hidden />
        ) : null}
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            className="rounded-lg p-1 text-cb-text-muted hover:bg-cb-hover-overlay"
            aria-label="مسح البحث"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {open && (results.length > 0 || error || loading) ? (
        <ul
          className="absolute start-0 end-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-cb-border bg-cb-surface py-1 shadow-xl"
          role="listbox"
        >
          {loading && results.length === 0 ? (
            <li className="px-3 py-3 text-center text-xs text-cb-text-muted">
              جاري البحث…
            </li>
          ) : null}
          {error && !loading && results.length === 0 ? (
            <li className="px-3 py-3 text-center text-xs text-amber-800">{error}</li>
          ) : null}
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                onClick={() => pick(item)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-start transition hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    item.kind === "zone"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-sky-100 text-sky-800",
                  )}
                >
                  {item.kind === "zone" ? (
                    <Navigation className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-cb-text-strong">
                    {item.label}
                  </span>
                  {item.sublabel ? (
                    <span className="mt-0.5 block truncate text-[11px] text-cb-text-muted">
                      {item.sublabel}
                    </span>
                  ) : null}
                  {item.kind === "place" ? (
                    <span className="mt-0.5 block font-mono text-[10px] text-cb-text-muted">
                      {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
