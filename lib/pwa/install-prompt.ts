import { getLocal, setLocal, getSession, setSession } from "@/lib/tracking-sdk/storage";

const DISMISS_KEY = "cb.pwa-install.dismissed";
const SESSION_SHOWN_KEY = "cb.pwa-install.shown-session";

export type InstallPlatform = "android" | "ios" | "other-mobile";

export function isPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneMq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standaloneMq || iosStandalone;
}

export function isMobileBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const touchMac =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || touchMac;
}

export function detectInstallPlatform(): InstallPlatform | null {
  if (!isMobileBrowser() || isPwaInstalled()) return null;
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  return "other-mobile";
}

export function wasInstallPromptDismissed(): boolean {
  return getLocal(DISMISS_KEY) === "1";
}

export function dismissInstallPrompt(): void {
  setLocal(DISMISS_KEY, "1");
}

export function wasInstallPromptShownThisSession(): boolean {
  return getSession(SESSION_SHOWN_KEY) === "1";
}

export function markInstallPromptShownThisSession(): void {
  setSession(SESSION_SHOWN_KEY, "1");
}

export function shouldOfferInstallPrompt(): boolean {
  return (
    detectInstallPlatform() !== null &&
    !wasInstallPromptDismissed() &&
    !wasInstallPromptShownThisSession()
  );
}
