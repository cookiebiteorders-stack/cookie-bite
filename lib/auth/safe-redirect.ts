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

  if (!v.startsWith("/") || v.startsWith("//") || v.includes("://")) {
    return fallback;
  }

  const noControl = !/[\u0000-\u001f\u007f]/.test(v);
  if (!noControl) return fallback;

  let path = v;
  try {
    const u = new URL(v, "https://example.com");
    path = `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return fallback;
  }

  if (path.startsWith("/sign-in") || path.startsWith("/sign-up")) {
    return fallback;
  }

  return path;
}
