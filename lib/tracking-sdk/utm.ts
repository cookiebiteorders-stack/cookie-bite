import type { UTMParams } from "./types";
import { getLocal, setLocal } from "./storage";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
] as const satisfies ReadonlyArray<keyof UTMParams>;

const STORAGE_KEY = "cb_utm";

/**
 * Extract UTM parameters from a URL search string (defaults to current URL).
 * Returns `undefined` if no parameters are present.
 */
export function parseUTMFromSearch(search: string): UTMParams | undefined {
  if (!search) return undefined;
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const out: UTMParams = {};
  let found = false;
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) {
      out[key] = value;
      found = true;
    }
  }
  return found ? out : undefined;
}

/**
 * Read UTM parameters for the current visitor. New ones from `window.location`
 * are persisted to localStorage so they survive subsequent page views and
 * remain attached to the session that captured them.
 */
export function captureUTM(): UTMParams | undefined {
  if (typeof window === "undefined") return undefined;
  const fromQuery = parseUTMFromSearch(window.location.search);
  if (fromQuery) {
    setLocal(STORAGE_KEY, JSON.stringify(fromQuery));
    return fromQuery;
  }
  const cached = getLocal(STORAGE_KEY);
  if (!cached) return undefined;
  try {
    return JSON.parse(cached) as UTMParams;
  } catch {
    return undefined;
  }
}
