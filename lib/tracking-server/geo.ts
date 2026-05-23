/**
 * Read the visitor IP and coarse geo data from request headers set by the
 * upstream proxy/CDN (Cloudflare, Vercel, fly.io, etc.).
 */
export interface GeoContext {
  ip: string | null;
  country: string | null;
  city: string | null;
}

const KNOWN_BOTS = [
  "googlebot",
  "bingbot",
  "yandex",
  "duckduckbot",
  "baiduspider",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "applebot",
  "slurp",
  "ahrefsbot",
  "semrushbot",
  "petalbot",
  "lighthouse",
];

function firstHeader(value: string | null | undefined): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

export function readGeoContext(req: Request): GeoContext {
  const headers = req.headers;
  const ip =
    firstHeader(headers.get("cf-connecting-ip")) ??
    firstHeader(headers.get("x-real-ip")) ??
    firstHeader(headers.get("x-forwarded-for"));

  const country =
    firstHeader(headers.get("cf-ipcountry")) ??
    firstHeader(headers.get("x-vercel-ip-country")) ??
    firstHeader(headers.get("x-country"));

  const city =
    firstHeader(headers.get("cf-ipcity")) ??
    firstHeader(headers.get("x-vercel-ip-city"));

  return { ip, country, city };
}

export function isUserAgentBot(ua: string | null | undefined): boolean {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return KNOWN_BOTS.some((needle) => lower.includes(needle));
}
