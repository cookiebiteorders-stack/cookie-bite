/** Shared Leaflet CDN loader (CSP allows openstreetmap tiles in next.config). */

export const LEAFLET_CSS =
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
export const LEAFLET_JS =
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";

/** Cairo — default map center for delivery / addresses */
export const CAIRO_MAP_CENTER: [number, number] = [30.0444, 31.2357];

let cdnLoaderPromise: Promise<LeafletStatic> | null = null;

export function loadLeafletFromCDN(): Promise<LeafletStatic> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet can only load in the browser"));
  }
  if (window.L) return Promise.resolve(window.L);
  if (cdnLoaderPromise) return cdnLoaderPromise;

  cdnLoaderPromise = new Promise<LeafletStatic>((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      link.crossOrigin = "";
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${LEAFLET_JS}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.L) resolve(window.L);
        else reject(new Error("Leaflet loaded without exposing L"));
      });
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Leaflet from CDN")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.crossOrigin = "";
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet loaded without exposing L"));
    };
    script.onerror = () => reject(new Error("Failed to load Leaflet from CDN"));
    document.head.appendChild(script);
  });

  return cdnLoaderPromise;
}
