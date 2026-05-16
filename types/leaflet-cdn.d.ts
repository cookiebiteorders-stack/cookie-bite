/**
 * Minimal ambient types for the Leaflet 1.9 global (`window.L`) that we load
 * from CDN inside the admin shipping page. We intentionally only expose the
 * subset of the API we actually use, to keep this surface small and avoid
 * pulling `@types/leaflet` into the dependency tree.
 */

declare global {
  interface LeafletLatLng {
    lat: number;
    lng: number;
  }

  interface LeafletLatLngExpression {
    lat: number;
    lng: number;
  }

  interface LeafletMouseEvent {
    latlng: LeafletLatLng;
    originalEvent: MouseEvent;
  }

  interface LeafletPathOptions {
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
    weight?: number;
    radius?: number;
    dashArray?: string;
  }

  interface LeafletPopup {
    setContent(content: string): LeafletPopup;
  }

  interface LeafletCircleMarker {
    addTo(map: LeafletMap): LeafletCircleMarker;
    setStyle(opts: LeafletPathOptions): LeafletCircleMarker;
    setLatLng(latlng: LeafletLatLngExpression | [number, number]): LeafletCircleMarker;
    bindPopup(popup: LeafletPopup): LeafletCircleMarker;
    openPopup(): LeafletCircleMarker;
    getPopup(): LeafletPopup | null;
    setPopupContent(content: string): LeafletCircleMarker;
    remove(): void;
  }

  interface LeafletCircle {
    addTo(map: LeafletMap): LeafletCircle;
    setStyle(opts: LeafletPathOptions): LeafletCircle;
    setLatLng(latlng: LeafletLatLngExpression | [number, number]): LeafletCircle;
    setRadius(radiusMeters: number): LeafletCircle;
    remove(): void;
  }

  interface LeafletTileLayer {
    addTo(map: LeafletMap): LeafletTileLayer;
  }

  interface LeafletMap {
    setView(center: [number, number], zoom: number): LeafletMap;
    on(event: "click", handler: (e: LeafletMouseEvent) => void): LeafletMap;
    off(event: "click", handler?: (e: LeafletMouseEvent) => void): LeafletMap;
    flyTo(
      latlng: LeafletLatLngExpression | [number, number],
      zoom?: number,
      opts?: { duration?: number },
    ): LeafletMap;
    removeLayer(layer: unknown): LeafletMap;
    remove(): void;
    invalidateSize(): LeafletMap;
  }

  interface LeafletStatic {
    map(
      el: HTMLElement,
      opts?: { zoomControl?: boolean },
    ): LeafletMap;
    tileLayer(
      url: string,
      opts?: { attribution?: string; maxZoom?: number },
    ): LeafletTileLayer;
    circle(
      latlng: LeafletLatLngExpression | [number, number],
      opts: LeafletPathOptions & { radius: number },
    ): LeafletCircle;
    circleMarker(
      latlng: LeafletLatLngExpression | [number, number],
      opts: LeafletPathOptions,
    ): LeafletCircleMarker;
    popup(opts?: {
      closeButton?: boolean;
      offset?: [number, number];
    }): LeafletPopup;
    latLng(lat: number, lng: number): LeafletLatLng;
  }

  interface Window {
    L?: LeafletStatic;
  }
}

export {};
