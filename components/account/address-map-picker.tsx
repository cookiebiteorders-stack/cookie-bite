"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Wifi } from "lucide-react";
import { AddressMapSearch } from "@/components/account/address-map-search";
import type { MapSearchResult } from "@/lib/map/geocode-search";
import { CAIRO_MAP_CENTER, loadLeafletFromCDN } from "@/lib/map/leaflet-cdn";
import {
  fetchIpGeolocation,
  reverseGeocode,
  type ReverseGeocodeResult,
} from "@/lib/map/reverse-geocode";
import { cn } from "@/lib/utils";

export type AddressMapHint = {
  street?: string | null;
  city?: string | null;
  governorate?: string | null;
  placeLabel?: string | null;
};

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  onAddressHint?: (hint: AddressMapHint) => void;
  className?: string;
};

function coordsNearlyEqual(a: number, b: number) {
  return Math.abs(a - b) < 1e-7;
}

export function AddressMapPicker({
  latitude,
  longitude,
  onChange,
  onAddressHint,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const onAddressHintRef = useRef(onAddressHint);
  const lastNotifiedRef = useRef<{ lat: number; lng: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState<"gps" | "ip" | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);

  onChangeRef.current = onChange;
  onAddressHintRef.current = onAddressHint;

  const notifyParent = useCallback((lat: number, lng: number) => {
    const prev = lastNotifiedRef.current;
    if (
      prev &&
      coordsNearlyEqual(prev.lat, lat) &&
      coordsNearlyEqual(prev.lng, lng)
    ) {
      return;
    }
    lastNotifiedRef.current = { lat, lng };
    onChangeRef.current(lat, lng);
  }, []);

  const applyReverseHint = useCallback(async (lat: number, lng: number, label?: string) => {
    if (label) setPlaceLabel(label);
    const hint = await reverseGeocode(lat, lng);
    if (!hint && !label) return;
    onAddressHintRef.current?.({
      street: hint?.street ?? null,
      city: hint?.city ?? null,
      governorate: hint?.governorate ?? null,
      placeLabel: label ?? hint?.label ?? null,
    });
  }, []);

  const goToCoords = useCallback(
    async (lat: number, lng: number, opts?: { zoom?: number; label?: string; reverse?: boolean }) => {
      const L = await loadLeafletFromCDN();
      if (!mapRef.current) return;
      mapRef.current.flyTo([lat, lng], opts?.zoom ?? 16, { duration: 0.6 });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current?.getLatLng();
          if (pos) {
            notifyParent(pos.lat, pos.lng);
            void applyReverseHint(pos.lat, pos.lng);
          }
        });
      }
      notifyParent(lat, lng);
      if (opts?.reverse !== false) {
        await applyReverseHint(lat, lng, opts?.label);
      } else if (opts?.label) {
        setPlaceLabel(opts.label);
      }
    },
    [notifyParent, applyReverseHint],
  );

  const placeMarker = useCallback(
    (L: LeafletStatic, lat: number, lng: number, notify: boolean) => {
      if (!mapRef.current) return;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current?.getLatLng();
          if (pos) {
            notifyParent(pos.lat, pos.lng);
            void applyReverseHint(pos.lat, pos.lng);
          }
        });
      }
      if (notify) notifyParent(lat, lng);
    },
    [notifyParent, applyReverseHint],
  );

  useEffect(() => {
    let cancelled = false;
    void loadLeafletFromCDN()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          center: CAIRO_MAP_CENTER,
          zoom: 11,
          scrollWheelZoom: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);
        map.on("click", (e: LeafletMouseEvent) => {
          void goToCoords(e.latlng.lat, e.latlng.lng, { reverse: true });
        });
        mapRef.current = map;
        const lat = latitude ?? CAIRO_MAP_CENTER[0];
        const lng = longitude ?? CAIRO_MAP_CENTER[1];
        placeMarker(L, lat, lng, true);
        setReady(true);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "تعذّر تحميل الخريطة");
      });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    if (!ready || latitude == null || longitude == null) return;
    void loadLeafletFromCDN().then((L) => placeMarker(L, latitude, longitude, false));
  }, [latitude, longitude, ready, placeMarker]);

  const onSearchSelect = useCallback(
    (item: MapSearchResult) => {
      setError(null);
      void goToCoords(item.lat, item.lng, { label: item.label, reverse: true });
    },
    [goToCoords],
  );

  const useDeviceGps = useCallback(() => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع — استخدم البحث أو الموقع التقريبي");
      return;
    }
    setLocating("gps");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(null);
        void goToCoords(pos.coords.latitude, pos.coords.longitude, {
          label: "موقعك الحالي (GPS)",
          reverse: true,
        });
      },
      (err) => {
        setLocating(null);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "لم يُسمح بالوصول للموقع — فعّل الموقع للموقع أو استخدم البحث"
            : err.code === err.TIMEOUT
              ? "انتهت مهلة GPS — جرّب مرة أخرى أو ابحث عن عنوانك"
              : "تعذّر قراءة GPS — استخدم البحث أو الموقع التقريبي";
        setError(msg);
      },
      { enableHighAccuracy: true, timeout: 14_000, maximumAge: 60_000 },
    );
  }, [goToCoords]);

  const useNetworkLocation = useCallback(() => {
    setLocating("ip");
    setError(null);
    void fetchIpGeolocation()
      .then((geo) => {
        setLocating(null);
        const note =
          geo.source === "ip"
            ? `${geo.label} (تقريبي من الشبكة)`
            : `${geo.label} (افتراضي)`;
        return goToCoords(geo.lat, geo.lng, { label: note, reverse: true });
      })
      .catch(() => {
        setLocating(null);
        setError("تعذّر تحديد الموقع التقريبي — ابحث يدوياً");
      });
  }, [goToCoords]);

  return (
    <div className={cn("space-y-3", className)}>
      <AddressMapSearch onSelect={onSearchSelect} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!ready || locating !== null}
          onClick={useDeviceGps}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-xs font-bold text-cb-text-strong transition hover:border-amber-300 hover:bg-amber-50 disabled:opacity-50 sm:flex-none sm:text-sm dark:hover:bg-amber-950/25"
        >
          {locating === "gps" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Crosshair className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          )}
          موقعي (GPS)
        </button>
        <button
          type="button"
          disabled={!ready || locating !== null}
          onClick={useNetworkLocation}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-xs font-bold text-cb-text-strong transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50 sm:flex-none sm:text-sm dark:hover:bg-sky-950/25"
        >
          {locating === "ip" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Wifi className="h-4 w-4 shrink-0 text-sky-700" aria-hidden />
          )}
          موقع تقريبي (شبكة)
        </button>
      </div>

      <p className="flex items-center gap-1.5 text-xs font-semibold text-cb-text-muted">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ابحث أو استخدم GPS، ثم اضغط على الخريطة أو اسحب الدبوس للتعديل الدقيق
      </p>

      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-xl border border-cb-border bg-cb-surface-2 sm:h-72"
        role="application"
        aria-label="خريطة تحديد الموقع"
      />

      {latitude != null && longitude != null ? (
        <div className="space-y-0.5">
          {placeLabel ? (
            <p className="text-xs font-medium text-cb-text-strong">{placeLabel}</p>
          ) : null}
          <p className="font-mono text-[11px] text-cb-text-muted">
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
        </div>
      ) : (
        <p className="text-xs text-amber-800">اختر موقعاً من البحث أو GPS أو الخريطة.</p>
      )}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
