/**
 * Lightweight, privacy-friendly browser fingerprint.
 *
 * It only mixes coarse, low-entropy signals (UA, language, timezone, screen
 * resolution, color depth, hardware concurrency) and produces a short hash.
 * It is not meant to defeat anti-fingerprinting browsers — its only job is to
 * tie an anonymous visitor across sessions on the same device when the
 * `visitor_id` cookie is cleared.
 */

function djb2(input: string): string {
  if (typeof input !== "string" || input.length === 0) return "0";
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function computeFingerprint(): string {
  if (typeof window === "undefined") return "ssr";

  const signals: Array<string | number | undefined> = [
    navigator.userAgent,
    navigator.language,
    Array.isArray(navigator.languages) ? navigator.languages.join(",") : undefined,
    navigator.hardwareConcurrency,
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    window.screen?.width,
    window.screen?.height,
    window.screen?.colorDepth,
    window.devicePixelRatio,
    typeof Intl !== "undefined" && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined,
    new Date().getTimezoneOffset(),
  ];

  // Convert all values to strings and filter out undefined/null
  const stringSignals = signals
    .filter((v) => v !== undefined && v !== null)
    .map((v) => String(v));

  const joined = stringSignals.join("|");
  return djb2(joined);
}
