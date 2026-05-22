"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import {
  resolveCityHintToPlace,
  searchCustomerAddressPlaces,
} from "@/lib/map/customer-address-search";
import type { MapSearchResult } from "@/lib/map/geocode-search";
import { cn } from "@/lib/utils";

type Props = {
  onSelect: (result: MapSearchResult) => void;
  className?: string;
};

export function AddressMapSearch({ onSelect, className }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const merged = await searchCustomerAddressPlaces(trimmed);
      setResults(merged);
      if (merged.length === 0) {
        setError("لا توجد نتائج — جرّب حيّاً أو مدينة (مثال: التجمع الخامس، مدينة نصر)");
      }
    } catch {
      setError("تعذّر البحث — تحقق من الاتصال");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = async (item: MapSearchResult) => {
    let resolved = item;
    if (item.kind === "city") {
      setLoading(true);
      const place = await resolveCityHintToPlace(item.label);
      setLoading(false);
      if (!place) {
        setError("لم نعثر على إحداثيات لهذه المدينة — جرّب اسم أدق");
        return;
      }
      resolved = place;
    }
    onSelect(resolved);
    setQuery(resolved.label);
    setOpen(false);
    setError(null);
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <label className="sr-only" htmlFor="address-map-search">
        ابحث عن عنوان أو حي أو مدينة
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-cb-border bg-cb-surface px-3 py-2.5 shadow-sm ring-1 ring-black/5">
        <Search className="h-4 w-4 shrink-0 text-cb-text-muted" aria-hidden />
        <input
          id="address-map-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
          placeholder="ابحث: حي، شارع، مجمّع سكني… (مثال: التجمع الخامس، الشيخ زايد)"
          className="min-w-0 flex-1 bg-transparent text-sm text-cb-text-strong outline-none placeholder:text-cb-text-muted"
          autoComplete="street-address"
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
              setError(null);
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
          className="absolute start-0 end-0 top-full z-[500] mt-1 max-h-56 overflow-y-auto rounded-xl border border-cb-border bg-cb-surface-elevated py-1 shadow-xl"
          role="listbox"
        >
          {loading && results.length === 0 ? (
            <li className="px-3 py-3 text-center text-xs text-cb-text-muted">جاري البحث…</li>
          ) : null}
          {error && !loading && results.length === 0 ? (
            <li className="px-3 py-3 text-center text-xs text-amber-800">{error}</li>
          ) : null}
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                onClick={() => void pick(item)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-start transition hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
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
