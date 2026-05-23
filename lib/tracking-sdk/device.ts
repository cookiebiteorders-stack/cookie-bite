import type { DeviceContext, DeviceType } from "./types";

const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /slurp/i,
  /facebookexternalhit/i,
  /pingdom/i,
  /lighthouse/i,
  /headlesschrome/i,
  /phantomjs/i,
  /puppeteer/i,
  /playwright/i,
];

export function isBot(ua: string | undefined): boolean {
  if (!ua) return false;
  return BOT_PATTERNS.some((re) => re.test(ua));
}

export function deviceTypeFromWidth(width: number): DeviceType {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

interface ParsedUA {
  browser: string;
  browser_version?: string;
  os: string;
  os_version?: string;
}

const BROWSER_REGEXES: Array<{ name: string; re: RegExp }> = [
  { name: "Edge", re: /Edg\/(\d+\.\d+)/ },
  { name: "Opera", re: /OPR\/(\d+\.\d+)/ },
  { name: "Chrome", re: /Chrome\/(\d+\.\d+)/ },
  { name: "Firefox", re: /Firefox\/(\d+\.\d+)/ },
  { name: "Safari", re: /Version\/(\d+\.\d+).*Safari/ },
  { name: "Samsung", re: /SamsungBrowser\/(\d+\.\d+)/ },
];

const OS_REGEXES: Array<{ name: string; re: RegExp }> = [
  { name: "Windows", re: /Windows NT (\d+\.\d+)/ },
  { name: "macOS", re: /Mac OS X ([\d_]+)/ },
  { name: "Android", re: /Android (\d+(?:\.\d+)?)/ },
  { name: "iOS", re: /OS (\d+(?:_\d+)?) like Mac OS X/ },
  { name: "Linux", re: /Linux/ },
];

export function parseUserAgent(ua: string | undefined): ParsedUA {
  if (!ua) return { browser: "Unknown", os: "Unknown" };

  let browser = "Unknown";
  let browser_version: string | undefined;
  for (const { name, re } of BROWSER_REGEXES) {
    const match = ua.match(re);
    if (match) {
      browser = name;
      browser_version = match[1];
      break;
    }
  }

  let os = "Unknown";
  let os_version: string | undefined;
  for (const { name, re } of OS_REGEXES) {
    const match = ua.match(re);
    if (match) {
      os = name;
      os_version = match[1]?.replace(/_/g, ".");
      break;
    }
  }

  return { browser, browser_version, os, os_version };
}

/**
 * Snapshot the browser/device context.
 */
export function readDeviceContext(): DeviceContext {
  if (typeof window === "undefined") {
    return { device_type: "desktop", is_bot: false };
  }

  const ua = navigator.userAgent;
  const { browser, browser_version, os, os_version } = parseUserAgent(ua);
  const viewport_width = window.innerWidth;
  const viewport_height = window.innerHeight;
  const device_type = deviceTypeFromWidth(viewport_width);
  const timezone =
    typeof Intl !== "undefined" && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined;

  return {
    device_type,
    browser,
    browser_version,
    os,
    os_version,
    screen_width: window.screen?.width,
    screen_height: window.screen?.height,
    viewport_width,
    viewport_height,
    device_pixel_ratio: window.devicePixelRatio,
    language: navigator.language,
    timezone,
    user_agent: ua,
    is_bot: isBot(ua),
  };
}
