/**
 * Returns the safest available absolute base URL for the application.
 * Prevents resolving to internal IPs (0.0.0.0, 127.0.0.1) when running behind a proxy.
 */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/**
 * يمنع فتح إعادة توجيه (open redirect) ويُرجع مساراً داخلياً آمناً فقط.
 * يُستخدم بعد تسجيل الدخول / إنشاء الحساب مع ?redirect_url=
 */
export function safeAuthRedirectPath(
  raw: string | string[] | undefined,
  fallback = "/account",
): string {
  const v = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!v) return fallback;

  // Prevent protocol-relative URLs (//example.com) and backslash bypass (/\example.com or \\example.com)
  if (
    !v.startsWith("/") || 
    v.startsWith("//") || 
    v.startsWith("/\\") || 
    v.includes("://") || 
    v.includes("\\\\")
  ) {
    return fallback;
  }

  const noControl = !/[\u0000-\u001f\u007f]/.test(v);
  if (!noControl) return fallback;

  let path = v;
  try {
    const u = new URL(v, getBaseUrl());
    path = `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return fallback;
  }

  if (path.startsWith("/sign-in") || path.startsWith("/sign-up") || path.startsWith("/forgot-password") || path.startsWith("/reset-password")) {
    return fallback;
  }

  return path;
}
