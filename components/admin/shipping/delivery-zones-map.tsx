"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Edit3,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import type { ShippingZoneRow } from "@/lib/shipping/types";
import { filterEgyptCities } from "@/lib/shipping/egypt-cities";
import { useShippingOrchestrationStore } from "@/stores/shipping-orchestration-store";
import {
  placeLabelToZoneName,
  searchPlacesNominatim,
  type MapSearchResult,
} from "@/lib/map/geocode-search";
import { CAIRO_MAP_CENTER, loadLeafletFromCDN } from "@/lib/map/leaflet-cdn";
import { fetchIpGeolocation, reverseGeocode } from "@/lib/map/reverse-geocode";
import {
  ZONE_GEO_PALETTE,
  deleteZoneGeo,
  getZoneGeo,
  loadZoneGeoStore,
  pickNextColor,
  saveZoneGeo,
  type ZoneGeo,
} from "@/lib/shipping/zone-geo";
import { MapPlaceSearch } from "@/components/admin/shipping/map-place-search";
import "@/components/admin/shipping/delivery-zones-map-scoped.css";

const DEFAULT_CENTER = CAIRO_MAP_CENTER;
const DEFAULT_ZOOM = 10;

type LayerHandles = { circle: LeafletCircle; marker: LeafletCircleMarker };

type DraftState = {
  name: string;
  cities: string[];
  feeEgp: string;
  etaMinDays: string;
  etaMaxDays: string;
  radiusKm: string;
  color: string;
  latlng: LeafletLatLng | null;
  editingZoneId: string | null;
  freeShippingEnabled: boolean;
  freeShippingThreshold: string;
  isActive: boolean;
};

const EMPTY_DRAFT: DraftState = {
  name: "",
  cities: [],
  feeEgp: "",
  etaMinDays: "1",
  etaMaxDays: "3",
  radiusKm: "5",
  color: ZONE_GEO_PALETTE[0],
  latlng: null,
  editingZoneId: null,
  freeShippingEnabled: false,
  freeShippingThreshold: "",
  isActive: true,
};

type DeliveryZonesMapProps = {
  existingNames?: string[];
};

function popupHTML(z: ShippingZoneRow, geo: ZoneGeo): string {
  const eta =
    z.eta_min_days === z.eta_max_days
      ? `${z.eta_min_days}d`
      : `${z.eta_min_days}–${z.eta_max_days}d`;
  return `<div style="font-family:'Inter','DM Sans',system-ui,sans-serif;font-size:12px;min-width:140px;line-height:1.5">
  <strong style="color:#1a1a1a;display:block;margin-bottom:2px">${escape(z.name)}</strong>
  <span style="color:#666">EGP ${Number(z.base_fee_egp).toFixed(0)} · ${eta} · ${Number(geo.radiusKm).toFixed(0)}km</span>
</div>`;
}

function escape(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function DeliveryZonesMap({ existingNames = [] }: DeliveryZonesMapProps) {
  const zones = useShippingOrchestrationStore((s) => s.zones);
  const mutating = useShippingOrchestrationStore((s) => s.mutating);
  const createZone = useShippingOrchestrationStore((s) => s.createZone);
  const updateZone = useShippingOrchestrationStore((s) => s.updateZone);
  const deleteZone = useShippingOrchestrationStore((s) => s.deleteZone);
  const pushToast = useShippingOrchestrationStore((s) => s.pushToast);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<Record<string, LayerHandles>>({});
  const tempLayersRef = useRef<{
    circle: LeafletCircle | null;
    marker: LeafletCircleMarker | null;
  }>({ circle: null, marker: null });
  const searchPinRef = useRef<LeafletCircleMarker | null>(null);
  const clickHandlerRef = useRef<((e: LeafletMouseEvent) => void) | null>(null);

  const [LRef, setLRef] = useState<LeafletStatic | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [geoStore, setGeoStore] = useState<Record<string, ZoneGeo>>(() => loadZoneGeoStore());

  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [picking, setPicking] = useState(false);
  const [hint, setHint] = useState<{
    kind: "info" | "ok" | "warn";
    text: string;
  }>({ kind: "info", text: "Click on the map to place this zone" });
  const [nameError, setNameError] = useState(false);
  const [cityDraft, setCityDraft] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [locating, setLocating] = useState<"gps" | "ip" | null>(null);
  const [locateError, setLocateError] = useState<string | null>(null);

  const nameList = useMemo(
    () => existingNames.map((n) => n.trim().toLowerCase()),
    [existingNames],
  );

  useEffect(() => {
    let cancelled = false;
    loadLeafletFromCDN()
      .then((L) => {
        if (!cancelled) setLRef(L);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load map");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!LRef || !containerRef.current || mapRef.current) return;
    const map = LRef.map(containerRef.current, { zoomControl: true }).setView(
      DEFAULT_CENTER,
      DEFAULT_ZOOM,
    );
    LRef.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 50);

    return () => {
      try {
        map.remove();
      } catch {
        // ignore — map already destroyed
      }
      mapRef.current = null;
      layersRef.current = {};
      tempLayersRef.current = { circle: null, marker: null };
    };
  }, [LRef]);

  const clearTempLayers = useCallback(() => {
    if (!mapRef.current) return;
    const { circle, marker } = tempLayersRef.current;
    if (circle) {
      mapRef.current.removeLayer(circle);
    }
    if (marker) {
      mapRef.current.removeLayer(marker);
    }
    tempLayersRef.current = { circle: null, marker: null };
  }, []);

  const clearSearchPin = useCallback(() => {
    if (!mapRef.current || !searchPinRef.current) return;
    mapRef.current.removeLayer(searchPinRef.current);
    searchPinRef.current = null;
  }, []);

  const placeDraftAt = useCallback(
    (lat: number, lng: number, label?: string) => {
      if (!mapRef.current || !LRef) return;
      clearTempLayers();
      clearSearchPin();
      const latlng = LRef.latLng(lat, lng);
      const radiusMeters = Math.max(1, Number(draft.radiusKm) || 5) * 1000;
      const circle = LRef.circle(latlng, {
        radius: radiusMeters,
        color: draft.color,
        fillColor: draft.color,
        fillOpacity: 0.15,
        weight: 2,
        dashArray: "6,4",
      }).addTo(mapRef.current);
      const marker = LRef.circleMarker(latlng, {
        radius: 7,
        color: "#ffffff",
        fillColor: draft.color,
        fillOpacity: 1,
        weight: 2,
      }).addTo(mapRef.current);
      tempLayersRef.current = { circle, marker };
      setDraft((d) => ({
        ...d,
        latlng,
        name:
          d.name.trim().length >= 2
            ? d.name
            : label
              ? placeLabelToZoneName(label)
              : d.name,
      }));
      setHint({
        kind: "ok",
        text: "تم تحديد الموقع من البحث — أكمل التفاصيل واحفظ",
      });
    },
    [LRef, draft.radiusKm, draft.color, clearTempLayers, clearSearchPin],
  );

  const showSearchPin = useCallback(
    (lat: number, lng: number) => {
      if (!mapRef.current || !LRef) return;
      clearSearchPin();
      searchPinRef.current = LRef.circleMarker([lat, lng], {
        radius: 9,
        color: "#ffffff",
        fillColor: "#2563eb",
        fillOpacity: 1,
        weight: 3,
      }).addTo(mapRef.current);
    },
    [LRef, clearSearchPin],
  );

  useEffect(() => {
    if (!LRef || !mapRef.current) return;
    const map = mapRef.current;
    const seenIds = new Set<string>();
    for (const zone of zones) {
      const geo = geoStore[zone.id];
      if (!geo) continue;
      seenIds.add(zone.id);
      const existing = layersRef.current[zone.id];
      if (existing) {
        existing.circle
          .setLatLng([geo.lat, geo.lng])
          .setRadius(geo.radiusKm * 1000)
          .setStyle({ color: geo.color, fillColor: geo.color });
        existing.marker
          .setLatLng([geo.lat, geo.lng])
          .setStyle({ fillColor: geo.color });
        const popup = existing.marker.getPopup();
        if (popup) {
          existing.marker.setPopupContent(popupHTML(zone, geo));
        }
      } else {
        const circle = LRef.circle([geo.lat, geo.lng], {
          radius: geo.radiusKm * 1000,
          color: geo.color,
          fillColor: geo.color,
          fillOpacity: 0.13,
          weight: 2,
        }).addTo(map);
        const marker = LRef.circleMarker([geo.lat, geo.lng], {
          radius: 7,
          color: "#ffffff",
          fillColor: geo.color,
          fillOpacity: 1,
          weight: 2,
        }).addTo(map);
        const popup = LRef.popup({ closeButton: false, offset: [0, -10] });
        popup.setContent(popupHTML(zone, geo));
        marker.bindPopup(popup);
        layersRef.current[zone.id] = { circle, marker };
      }
    }
    for (const id of Object.keys(layersRef.current)) {
      if (!seenIds.has(id)) {
        const { circle, marker } = layersRef.current[id];
        try {
          circle.remove();
        } catch {
          // ignore
        }
        try {
          marker.remove();
        } catch {
          // ignore
        }
        delete layersRef.current[id];
      }
    }
  }, [LRef, geoStore, zones]);

  useEffect(() => {
    if (!LRef || !mapRef.current) return;
    if (clickHandlerRef.current) {
      mapRef.current.off("click", clickHandlerRef.current);
      clickHandlerRef.current = null;
    }
    if (!picking) return;

    const handler = (event: LeafletMouseEvent) => {
      if (!mapRef.current || !LRef) return;
      clearTempLayers();
      const radiusMeters = Math.max(1, Number(draft.radiusKm) || 5) * 1000;
      const circle = LRef.circle(event.latlng, {
        radius: radiusMeters,
        color: draft.color,
        fillColor: draft.color,
        fillOpacity: 0.15,
        weight: 2,
        dashArray: "6,4",
      }).addTo(mapRef.current);
      const marker = LRef.circleMarker(event.latlng, {
        radius: 7,
        color: "#ffffff",
        fillColor: draft.color,
        fillOpacity: 1,
        weight: 2,
      }).addTo(mapRef.current);
      tempLayersRef.current = { circle, marker };
      setDraft((d) => ({ ...d, latlng: event.latlng }));
      setHint({
        kind: "ok",
        text: "Location set — fill in the details and save",
      });
    };

    clickHandlerRef.current = handler;
    mapRef.current.on("click", handler);

    return () => {
      if (mapRef.current && clickHandlerRef.current) {
        mapRef.current.off("click", clickHandlerRef.current);
      }
      clickHandlerRef.current = null;
    };
  }, [LRef, picking, draft.color, draft.radiusKm, clearTempLayers]);

  useEffect(() => {
    if (!tempLayersRef.current.circle) return;
    const radiusMeters = Math.max(1, Number(draft.radiusKm) || 5) * 1000;
    tempLayersRef.current.circle.setRadius(radiusMeters);
    tempLayersRef.current.circle.setStyle({
      color: draft.color,
      fillColor: draft.color,
    });
    tempLayersRef.current.marker?.setStyle({ fillColor: draft.color });
  }, [draft.color, draft.radiusKm]);

  const stats = useMemo(() => {
    const placed = zones.filter((z) => geoStore[z.id]);
    const count = placed.length;
    const avgFee = count
      ? Math.round(placed.reduce((sum, z) => sum + z.base_fee_egp, 0) / count)
      : null;
    const fastest = placed.length
      ? placed.reduce((acc, z) =>
          z.eta_min_days < acc.eta_min_days ? z : acc,
        )
      : null;
    return {
      count,
      total: zones.length,
      avgFee,
      fastest: fastest ? fastest.eta_min_days : null,
    };
  }, [zones, geoStore]);

  const placedZones = useMemo(() => {
    return zones
      .map((z) => ({ zone: z, geo: geoStore[z.id] }))
      .filter((entry): entry is { zone: ShippingZoneRow; geo: ZoneGeo } => Boolean(entry.geo));
  }, [zones, geoStore]);

  const usedColors = useMemo(
    () => Object.values(geoStore).map((g) => g.color),
    [geoStore],
  );

  const commitCities = useCallback((raw: string) => {
    const parts = raw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setDraft((d) => {
      const lower = new Set(d.cities.map((c) => c.toLowerCase()));
      const next = [...d.cities];
      for (const p of parts) {
        if (!lower.has(p.toLowerCase())) {
          next.push(p);
          lower.add(p.toLowerCase());
        }
      }
      return { ...d, cities: next };
    });
    setCityDraft("");
    setCitySuggestions([]);
  }, []);

  const applyCoordsOnMap = useCallback(
    (lat: number, lng: number, label?: string) => {
      if (!mapRef.current) return;
      mapRef.current.flyTo([lat, lng], 14, { duration: 0.65 });
      showSearchPin(lat, lng);
      setLocateError(null);

      if (!formOpen) {
        const color = pickNextColor(usedColors);
        setDraft({ ...EMPTY_DRAFT, color });
        setFormOpen(true);
        setPicking(true);
        setNameError(false);
        setHint({
          kind: "info",
          text: "تم تحديد الموقع — أكمل التفاصيل واحفظ",
        });
      }

      placeDraftAt(lat, lng, label);
      void reverseGeocode(lat, lng).then((hint) => {
        if (!hint) return;
        setDraft((d) => {
          const lower = new Set(d.cities.map((c) => c.toLowerCase()));
          const next = [...d.cities];
          for (const c of [hint.city, hint.governorate].filter(Boolean) as string[]) {
            if (!lower.has(c.toLowerCase())) {
              next.push(c);
              lower.add(c.toLowerCase());
            }
          }
          const suggestedName =
            d.name.trim().length >= 2
              ? d.name
              : hint.city
                ? placeLabelToZoneName(hint.city)
                : label
                  ? placeLabelToZoneName(label)
                  : d.name;
          return {
            ...d,
            cities: next,
            name: suggestedName,
          };
        });
      });
    },
    [formOpen, placeDraftAt, showSearchPin, usedColors],
  );

  const useDeviceGps = useCallback(() => {
    if (!LRef) return;
    if (!navigator.geolocation) {
      setLocateError("المتصفح لا يدعم GPS — استخدم الشبكة أو البحث");
      return;
    }
    setLocating("gps");
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(null);
        void applyCoordsOnMap(
          pos.coords.latitude,
          pos.coords.longitude,
          "موقعك الحالي (GPS)",
        );
      },
      (err) => {
        setLocating(null);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "لم يُسمح بالوصول للموقع — فعّل GPS أو استخدم الشبكة"
            : err.code === err.TIMEOUT
              ? "انتهت مهلة GPS — جرّب مرة أخرى"
              : "تعذّر قراءة GPS";
        setLocateError(msg);
      },
      { enableHighAccuracy: true, timeout: 14_000, maximumAge: 60_000 },
    );
  }, [LRef, applyCoordsOnMap]);

  const useNetworkLocation = useCallback(() => {
    if (!LRef) return;
    setLocating("ip");
    setLocateError(null);
    void fetchIpGeolocation()
      .then((geo) => {
        setLocating(null);
        const note =
          geo.source === "ip"
            ? `${geo.label} (تقريبي من الشبكة)`
            : `${geo.label} (افتراضي)`;
        return applyCoordsOnMap(geo.lat, geo.lng, note);
      })
      .catch(() => {
        setLocating(null);
        setLocateError("تعذّر تحديد الموقع التقريبي — ابحث يدوياً");
      });
  }, [LRef, applyCoordsOnMap]);

  const openCreateForm = () => {
    const color = pickNextColor(usedColors);
    setDraft({ ...EMPTY_DRAFT, color });
    setCityDraft("");
    setFormOpen(true);
    setPicking(true);
    setNameError(false);
    setLocateError(null);
    setHint({ kind: "info", text: "انقر على الخريطة أو استخدم GPS/الشبكة لتحديد الموقع" });
    clearTempLayers();
  };

  const openEditForm = (zone: ShippingZoneRow) => {
    const geo = geoStore[zone.id] ?? null;
    setDraft({
      name: zone.name,
      cities: [...zone.cities],
      feeEgp: String(zone.base_fee_egp),
      etaMinDays: String(Math.max(0, zone.eta_min_days)),
      etaMaxDays: String(Math.max(zone.eta_min_days, zone.eta_max_days)),
      radiusKm: String(geo?.radiusKm ?? 5),
      color: geo?.color ?? pickNextColor(usedColors),
      latlng: null,
      editingZoneId: zone.id,
      freeShippingEnabled: zone.free_shipping_threshold_egp != null,
      freeShippingThreshold:
        zone.free_shipping_threshold_egp != null
          ? String(zone.free_shipping_threshold_egp)
          : "",
      isActive: zone.is_active,
    });
    setCityDraft("");
    setFormOpen(true);
    setPicking(true);
    setNameError(false);
    setHint({
      kind: "info",
      text: geo
        ? "Click the map to move this zone, or save to keep the current location"
        : "Click on the map to place this zone",
    });
    if (geo && mapRef.current) {
      mapRef.current.flyTo([geo.lat, geo.lng], 12, { duration: 0.5 });
    }
    clearTempLayers();
  };

  const cancelForm = () => {
    setFormOpen(false);
    setPicking(false);
    setDraft(EMPTY_DRAFT);
    setCityDraft("");
    setCitySuggestions([]);
    setNameError(false);
    setLocateError(null);
    clearTempLayers();
  };

  const focusZone = (zone: ShippingZoneRow) => {
    const geo = geoStore[zone.id];
    if (!geo || !mapRef.current) return;
    mapRef.current.flyTo([geo.lat, geo.lng], 13, { duration: 0.7 });
    const layer = layersRef.current[zone.id];
    layer?.marker.openPopup();
  };

  const handleSearchPlace = useCallback(
    async (result: MapSearchResult) => {
      let lat = result.lat;
      let lng = result.lng;
      if (result.kind === "city") {
        const places = await searchPlacesNominatim(result.label, 1);
        if (!places[0]) {
          pushToast(`لم يُعثر على إحداثيات لـ «${result.label}»`, "error");
          return;
        }
        lat = places[0].lat;
        lng = places[0].lng;
      }
      applyCoordsOnMap(lat, lng, result.label);
      if (result.kind === "city" || result.kind === "place") {
        const hint = await reverseGeocode(lat, lng);
        const cityName = hint?.city ?? result.label.split(",")[0]?.trim();
        if (cityName) {
          setDraft((d) => {
            const lower = new Set(d.cities.map((c) => c.toLowerCase()));
            if (lower.has(cityName.toLowerCase())) return d;
            return { ...d, cities: [...d.cities, cityName] };
          });
        }
      }
    },
    [applyCoordsOnMap, pushToast],
  );

  const handleSearchZone = useCallback(
    (zone: ShippingZoneRow) => {
      const geo = geoStore[zone.id];
      if (geo) {
        focusZone(zone);
        return;
      }
      openEditForm(zone);
      pushToast(
        `«${zone.name}» غير موضوعة على الخريطة — ابحث عن المكان ثم انقر للحفظ`,
      );
    },
    [geoStore, pushToast],
  );

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    const name = draft.name.trim();
    if (name.length < 2) {
      setNameError(true);
      return;
    }
    const nameKey = name.toLowerCase();
    if (
      !draft.editingZoneId &&
      nameList.includes(nameKey)
    ) {
      setNameError(true);
      setHint({
        kind: "warn",
        text: "يوجد منطقة بنفس الاسم — اختر اسماً مختلفاً",
      });
      return;
    }
    const cities =
      draft.cities.length > 0
        ? draft.cities.map((c) => c.trim()).filter(Boolean)
        : [name];
    if (!cities.length) {
      setHint({ kind: "warn", text: "أضف مدينة واحدة على الأقل" });
      return;
    }
    const fee = Math.max(0, Number(draft.feeEgp) || 0);
    const etaMin = Math.max(0, Math.floor(Number(draft.etaMinDays) || 0));
    const etaMax = Math.max(etaMin, Math.floor(Number(draft.etaMaxDays) || etaMin));
    const radiusKm = Math.max(1, Number(draft.radiusKm) || 5);
    const freeThreshold = draft.freeShippingEnabled
      ? Math.max(0, Number(draft.freeShippingThreshold) || 0)
      : null;

    if (!draft.editingZoneId && !draft.latlng) {
      setHint({
        kind: "warn",
        text: "حدّد الموقع على الخريطة أو عبر GPS/الشبكة أولاً",
      });
      return;
    }

    setNameError(false);
    const zonePatch = {
      name,
      cities,
      base_fee_egp: fee,
      free_shipping_threshold_egp: freeThreshold,
      eta_min_days: etaMin,
      eta_max_days: etaMax,
      is_active: draft.isActive,
    };

    if (draft.editingZoneId) {
      const previousGeo = getZoneGeo(draft.editingZoneId);
      const latlng = draft.latlng
        ? { lat: draft.latlng.lat, lng: draft.latlng.lng }
        : previousGeo
          ? { lat: previousGeo.lat, lng: previousGeo.lng }
          : null;
      if (!latlng) {
        setHint({
          kind: "warn",
          text: "انقر على الخريطة لتحديد موقع هذه المنطقة",
        });
        return;
      }
      saveZoneGeo(draft.editingZoneId, {
        lat: latlng.lat,
        lng: latlng.lng,
        radiusKm,
        color: draft.color,
      });
      setGeoStore(loadZoneGeoStore());
      await updateZone(draft.editingZoneId, zonePatch);
    } else if (draft.latlng) {
      const created = await createZone(zonePatch);
      if (created) {
        saveZoneGeo(created.id, {
          lat: draft.latlng.lat,
          lng: draft.latlng.lng,
          radiusKm,
          color: draft.color,
        });
        setGeoStore(loadZoneGeoStore());
      }
    }

    cancelForm();
  };

  const handleDelete = async (zone: ShippingZoneRow) => {
    if (!window.confirm(`Delete zone "${zone.name}"?`)) return;
    const ok = await deleteZone(zone.id);
    if (ok) {
      deleteZoneGeo(zone.id);
      setGeoStore(loadZoneGeoStore());
    }
  };

  const handleRemoveFromMap = (zone: ShippingZoneRow) => {
    deleteZoneGeo(zone.id);
    setGeoStore(loadZoneGeoStore());
    pushToast(`Removed ${zone.name} from the map`, "success");
  };

  return (
    <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">
            Delivery zones manager
          </p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-stone-950">
            Map-based zone placement
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-700">
            أضِف مناطق التوصيل من مكان واحد: ابحث، أو استخدم GPS/الشبكة، أو انقر
            على الخريطة، ثم أكمل الاسم والمدن والرسوم. الموقع الجغرافي يُحفظ
            محلياً في المتصفح؛ بقية البيانات تُزامَن مع قاعدة البيانات.
          </p>
        </div>
      </header>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <StatCard label="Placed on map" value={`${stats.count} / ${stats.total}`} />
        <StatCard label="Avg. delivery fee" value={stats.avgFee != null ? `EGP ${stats.avgFee}` : "—"} />
        <StatCard label="Fastest delivery" value={stats.fastest != null ? `${stats.fastest}d` : "—"} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
        <aside className="flex flex-col gap-3">
          {!formOpen ? (
            <button
              type="button"
              onClick={openCreateForm}
              disabled={!LRef || mutating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cb-brand-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cb-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add delivery zone
            </button>
          ) : null}

          {formOpen ? (
            <form
              onSubmit={handleSave}
              className="flex flex-col gap-3 rounded-2xl border border-cb-border bg-cb-surface p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-cb-text-strong">
                  {draft.editingZoneId ? "Edit zone" : "New zone"}
                </h3>
                <button
                  type="button"
                  onClick={cancelForm}
                  aria-label="Close form"
                  className="rounded-md p-1 text-cb-text-muted hover:bg-cb-hover-overlay"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <label className="block">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-cb-text-muted">
                  Zone name
                </span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, name: e.target.value }));
                    if (nameError) setNameError(false);
                  }}
                  placeholder="e.g. Downtown Cairo"
                  className={`mt-1 w-full rounded-lg border bg-cb-surface px-2.5 py-1.5 text-sm outline-none transition focus:border-cb-brand-500 focus:ring-2 focus:ring-cb-brand-500/25 ${
                    nameError ? "border-red-400" : "border-cb-border"
                  }`}
                />
              </label>
              <div className="block">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-cb-text-muted">
                  Cities
                </span>
                <div className="mt-1 flex min-h-[40px] flex-wrap gap-1.5 rounded-lg border border-cb-border bg-cb-surface p-2">
                  {draft.cities.map((city, index) => (
                    <span
                      key={`${city}-${index}`}
                      className="inline-flex items-center gap-1 rounded-full border border-cb-border bg-cb-cream-2/80 px-2 py-0.5 text-[11px] font-semibold text-cb-text-strong"
                    >
                      {city}
                      <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-cb-hover-overlay"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            cities: d.cities.filter((_, i) => i !== index),
                          }))
                        }
                        aria-label={`Remove ${city}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    className="min-w-[100px] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none"
                    value={cityDraft}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCityDraft(v);
                      setCitySuggestions(filterEgyptCities(v));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        commitCities(cityDraft);
                      } else if (
                        e.key === "Backspace" &&
                        !cityDraft &&
                        draft.cities.length
                      ) {
                        setDraft((d) => ({
                          ...d,
                          cities: d.cities.slice(0, -1),
                        }));
                      }
                    }}
                    onBlur={() => {
                      if (cityDraft.trim()) commitCities(cityDraft);
                    }}
                    placeholder={
                      draft.cities.length ? "Add city…" : "City, Enter"
                    }
                  />
                </div>
                {citySuggestions.length > 0 && cityDraft.trim() ? (
                  <ul className="mt-1 max-h-24 overflow-auto rounded-lg border border-cb-border bg-cb-surface text-xs shadow-md">
                    {citySuggestions.map((c) => (
                      <li key={c}>
                        <button
                          type="button"
                          className="block w-full px-2 py-1.5 text-start hover:bg-cb-hover-overlay"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => commitCities(c)}
                        >
                          {c}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-cb-text-muted">
                    Fee (EGP)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={draft.feeEgp}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, feeEgp: e.target.value }))
                    }
                    placeholder="30"
                    className="mt-1 w-full rounded-lg border border-cb-border bg-cb-surface px-2.5 py-1.5 text-sm outline-none focus:border-cb-brand-500 focus:ring-2 focus:ring-cb-brand-500/25"
                  />
                </label>
                <label className="flex items-end gap-2 pb-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, isActive: e.target.checked }))
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span className="font-semibold text-cb-text-strong">Active</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-cb-text-muted">
                    ETA min (days)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={draft.etaMinDays}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, etaMinDays: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-cb-border bg-cb-surface px-2.5 py-1.5 text-sm outline-none focus:border-cb-brand-500 focus:ring-2 focus:ring-cb-brand-500/25"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-cb-text-muted">
                    ETA max (days)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={draft.etaMaxDays}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, etaMaxDays: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-cb-border bg-cb-surface px-2.5 py-1.5 text-sm outline-none focus:border-cb-brand-500 focus:ring-2 focus:ring-cb-brand-500/25"
                  />
                </label>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.freeShippingEnabled}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      freeShippingEnabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded"
                />
                <span className="font-semibold text-cb-text-strong">
                  Free shipping threshold (EGP)
                </span>
              </label>
              {draft.freeShippingEnabled ? (
                <input
                  type="number"
                  min={0}
                  value={draft.freeShippingThreshold}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      freeShippingThreshold: e.target.value,
                    }))
                  }
                  placeholder="500"
                  className="w-full rounded-lg border border-cb-border bg-cb-surface px-2.5 py-1.5 text-sm outline-none focus:border-cb-brand-500 focus:ring-2 focus:ring-cb-brand-500/25"
                />
              ) : null}
              <label className="block">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-cb-text-muted">
                  Radius (km)
                </span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  step={1}
                  value={draft.radiusKm}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, radiusKm: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-cb-border bg-cb-surface px-2.5 py-1.5 text-sm outline-none focus:border-cb-brand-500 focus:ring-2 focus:ring-cb-brand-500/25"
                />
              </label>
              <div className="block">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-cb-text-muted">
                  Zone color
                </span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {ZONE_GEO_PALETTE.map((color) => {
                    const active = draft.color === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, color }))}
                        aria-label={`Pick color ${color}`}
                        className={`h-6 w-6 rounded-full transition ${
                          active
                            ? "scale-110 ring-2 ring-cb-text-strong ring-offset-2 ring-offset-cb-surface"
                            : "ring-1 ring-transparent hover:scale-105"
                        }`}
                        style={{ background: color }}
                      />
                    );
                  })}
                </div>
              </div>
              <HintBanner kind={hint.kind} text={hint.text} />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="flex-1 rounded-lg border border-cb-border px-3 py-2 text-sm font-semibold text-cb-text hover:bg-cb-hover-overlay"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutating}
                  className="flex-1 rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
                >
                  {mutating ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    "Save zone"
                  )}
                </button>
              </div>
            </form>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <p className="px-1 text-[10px] font-bold uppercase tracking-wide text-cb-text-muted">
              Placed zones ({placedZones.length})
            </p>
            {placedZones.length === 0 ? (
              <div className="rounded-xl border border-dashed border-cb-border bg-cb-surface/60 px-3 py-4 text-center text-xs text-cb-text">
                No delivery zones placed on the map yet.
                <br />
                Click <strong>Add delivery zone</strong> to start.
              </div>
            ) : (
              <ul className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                {placedZones.map(({ zone, geo }) => (
                  <li
                    key={zone.id}
                    className="group flex items-center gap-2 rounded-xl border border-cb-border bg-cb-surface px-3 py-2 transition hover:border-cb-brand-500"
                  >
                    <button
                      type="button"
                      onClick={() => focusZone(zone)}
                      className="flex flex-1 items-center gap-2 text-left"
                      title="Focus on map"
                    >
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ background: geo.color }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-cb-text-strong">
                          {zone.name}
                        </span>
                        <span className="block text-[11px] text-cb-text-muted">
                          EGP {zone.base_fee_egp} · {zone.eta_min_days}d · {geo.radiusKm.toFixed(0)}km
                        </span>
                      </span>
                    </button>
                    <div className="flex flex-shrink-0 gap-0.5">
                      <button
                        type="button"
                        onClick={() => openEditForm(zone)}
                        aria-label="Edit zone"
                        className="rounded-md border border-cb-border p-1.5 text-cb-text-muted hover:bg-cb-hover-overlay hover:text-cb-text-strong"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromMap(zone)}
                        aria-label="Remove from map"
                        title="Remove from map (keep zone)"
                        className="rounded-md border border-cb-border p-1.5 text-cb-text-muted hover:bg-cb-hover-overlay hover:text-cb-text-strong"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(zone)}
                        aria-label="Delete zone"
                        className="rounded-md border border-cb-border p-1.5 text-red-600 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <div className="delivery-zones-map-frame relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-cb-border bg-cb-surface/40 p-2">
          <MapPlaceSearch
            zones={zones}
            geoStore={geoStore}
            onSelectPlace={(r) => void handleSearchPlace(r)}
            onSelectZone={handleSearchZone}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!LRef || locating !== null}
              onClick={useDeviceGps}
              className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-xs font-bold text-cb-text-strong transition hover:border-amber-300 hover:bg-amber-50 disabled:opacity-50 sm:flex-none dark:hover:bg-amber-950/25"
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
              disabled={!LRef || locating !== null}
              onClick={useNetworkLocation}
              className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-xs font-bold text-cb-text-strong transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50 sm:flex-none dark:hover:bg-sky-950/25"
            >
              {locating === "ip" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Wifi className="h-4 w-4 shrink-0 text-sky-700" aria-hidden />
              )}
              موقع تقريبي (شبكة)
            </button>
          </div>
          {locateError ? (
            <p className="text-xs font-medium text-red-600">{locateError}</p>
          ) : null}
          {loadError ? (
            <div className="flex h-[460px] items-center justify-center rounded-xl border border-dashed border-red-300 bg-red-50/60 px-6 text-center text-sm text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-100">
              <div>
                <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
                <p className="font-semibold">Map failed to load</p>
                <p className="mt-1 text-xs">{loadError}</p>
              </div>
            </div>
          ) : !LRef ? (
            <div className="flex h-[460px] items-center justify-center rounded-xl border border-cb-border bg-cb-surface/60 text-sm text-cb-text-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading map…
            </div>
          ) : null}
          <div
            ref={containerRef}
            className={`relative z-0 h-[460px] w-full overflow-hidden rounded-xl border ${
              picking ? "border-cb-brand-500 ring-2 ring-cb-brand-500/20" : "border-cb-border"
            } ${loadError || !LRef ? "hidden" : ""}`}
            style={{ cursor: picking ? "crosshair" : undefined }}
            role="application"
            aria-label="خريطة مناطق التوصيل"
          />
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cb-border bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-stone-600">
        {label}
      </p>
      <p className="mt-1 font-serif text-xl font-semibold text-stone-950">
        {value}
      </p>
    </div>
  );
}

function HintBanner({
  kind,
  text,
}: {
  kind: "info" | "ok" | "warn";
  text: string;
}) {
  const styles =
    kind === "ok"
      ? "bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-700"
      : kind === "warn"
        ? "bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-700"
        : "bg-stone-100 text-stone-700 border border-stone-200 dark:bg-stone-900/60 dark:text-stone-200 dark:border-stone-700";
  const Icon =
    kind === "ok" ? CheckCircle2 : kind === "warn" ? AlertTriangle : MapPin;
  return (
    <p
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${styles}`}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{text}</span>
    </p>
  );
}
