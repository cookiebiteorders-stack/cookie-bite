/**
 * أحداث GA4 اختيارية — لا تُرمى أخطاء عند غياب NEXT_PUBLIC_GA_ID.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackGa4Event(
  name: string,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_GA_ID) return;
  const clean: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) clean[k] = v;
    }
  }
  window.gtag?.("event", name, clean);
}
