"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { CAIRO_MAP_CENTER, loadLeafletFromCDN } from "@/lib/map/leaflet-cdn";
import { cn } from "@/lib/utils";

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  className?: string;
};

export function AddressMapPicker({ latitude, longitude, onChange, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setMarker = useCallback(
    (L: LeafletStatic, lat: number, lng: number) => {
      if (!mapRef.current) return;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current?.getLatLng();
          if (pos) onChange(pos.lat, pos.lng);
        });
      }
      onChange(lat, lng);
    },
    [onChange],
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
          setMarker(L, e.latlng.lat, e.latlng.lng);
        });
        mapRef.current = map;
        const lat = latitude ?? CAIRO_MAP_CENTER[0];
        const lng = longitude ?? CAIRO_MAP_CENTER[1];
        setMarker(L, lat, lng);
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
    void loadLeafletFromCDN().then((L) => setMarker(L, latitude, longitude));
  }, [latitude, longitude, ready, setMarker]);

  return (
    <div className={cn("space-y-2", className)}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-cb-text-muted">
        <MapPin className="h-3.5 w-3.5" aria-hidden />
        اضغط على الخريطة أو اسحب الدبوس لتحديد موقع التوصيل بدقة
      </p>
      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-xl border border-cb-border bg-cb-surface-2 sm:h-64"
        role="application"
        aria-label="خريطة تحديد الموقع"
      />
      {latitude != null && longitude != null ? (
        <p className="font-mono text-[11px] text-cb-text-muted">
          GPS: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      ) : (
        <p className="text-xs text-amber-800">اختر موقعاً على الخريطة.</p>
      )}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
