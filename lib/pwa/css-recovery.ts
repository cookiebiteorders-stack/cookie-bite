const RECOVERY_FLAG = "cb-css-recovery-attempted";
const VERSION_KEY = "cb-build-version";

async function clearServiceWorkerCaches(): Promise<void> {
  if (typeof caches === "undefined") return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

async function unregisterServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((reg) => reg.unregister()));
}

/** True when Tailwind/globals bundle applied (not just critical inline CSS). */
export function isTailwindCssLoaded(): boolean {
  if (typeof document === "undefined") return true;

  const storefront = document.querySelector(".cb-storefront");
  if (storefront) {
    return window.getComputedStyle(storefront).display === "flex";
  }

  const probe = document.createElement("div");
  probe.className = "sr-only";
  probe.setAttribute("aria-hidden", "true");
  document.body.appendChild(probe);
  const styles = window.getComputedStyle(probe);
  const ok = styles.position === "absolute" && styles.overflow === "hidden";
  probe.remove();
  return ok;
}

export function isStylesheetBundleLoaded(): boolean {
  if (typeof document === "undefined") return true;

  const styleTags = document.querySelectorAll("style");
  if (styleTags.length > 0) return true;

  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  if (links.length === 0) return false;

  return links.some((link) => {
    try {
      const sheet = link.sheet;
      return !!sheet && sheet.cssRules.length > 0;
    } catch {
      return false;
    }
  });
}

export function needsCssRecovery(): boolean {
  return !isTailwindCssLoaded() || !isStylesheetBundleLoaded();
}

async function fetchBuildVersion(): Promise<string | null> {
  try {
    const res = await fetch("/build-version.txt", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.text()).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Recover from stale PWA / missing static CSS:
 * clear SW + caches once per session, then hard-reload.
 */
export async function runCssRecoveryIfNeeded(): Promise<void> {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(RECOVERY_FLAG) === "1") return;

  const remoteVersion = await fetchBuildVersion();
  const localVersion = localStorage.getItem(VERSION_KEY);
  const versionChanged =
    remoteVersion != null && localVersion != null && remoteVersion !== localVersion;
  const cssBroken = needsCssRecovery();

  if (!cssBroken && !versionChanged) {
    if (remoteVersion) localStorage.setItem(VERSION_KEY, remoteVersion);
    return;
  }

  sessionStorage.setItem(RECOVERY_FLAG, "1");
  await clearServiceWorkerCaches();
  await unregisterServiceWorkers();
  if (remoteVersion) localStorage.setItem(VERSION_KEY, remoteVersion);
  window.location.reload();
}
