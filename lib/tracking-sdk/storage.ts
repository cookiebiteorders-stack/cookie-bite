/**
 * Safe wrappers around localStorage and document.cookie that never throw
 * (private-browsing, SSR, blocked storage, etc.).
 */

export function getLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setLocal(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function getSession(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setSession(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

interface CookieOptions {
  days?: number;
  path?: string;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const target = `${encodeURIComponent(name)}=`;
  const parts = document.cookie ? document.cookie.split("; ") : [];
  for (const part of parts) {
    if (part.startsWith(target)) {
      return decodeURIComponent(part.slice(target.length));
    }
  }
  return null;
}

export function setCookie(
  name: string,
  value: string,
  { days = 365, path = "/", sameSite = "Lax", secure = true }: CookieOptions = {},
): void {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `expires=${expires.toUTCString()}`,
    `path=${path}`,
    `SameSite=${sameSite}`,
  ];
  if (secure) parts.push("Secure");
  document.cookie = parts.join("; ");
}

export function persistId(key: string, value: string): void {
  setLocal(key, value);
  setCookie(key, value, { days: 365 });
}

export function readPersistedId(key: string): string | null {
  return getLocal(key) ?? getCookie(key);
}
