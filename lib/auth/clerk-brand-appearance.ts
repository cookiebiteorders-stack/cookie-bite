/**
 * ألوان Clerk — متزامنة مع `app/styles/tokens.css` (العلامة البرتقالية #f97316).
 * Clerk لا يقبل `var(--token)` في كل الحقول؛ نُثبّت القيم هنا عند تغيير الـ palette.
 */
export const CLERK_BRAND_VARIABLES = {
  colorPrimary: "#f97316",
  colorDanger: "#ef4444",
  colorSuccess: "#22c55e",
  colorWarning: "#fbbf24",
  colorText: "#2d1810",
  colorTextSecondary: "#5c3d2e",
  colorTextOnPrimaryBackground: "#ffffff",
  colorBackground: "#fffaf4",
  colorInputBackground: "#fff8f0",
  colorInputText: "#2d1810",
  colorNeutral: "#8b6b5a",
  borderRadius: "0.875rem",
  spacingUnit: "0.9rem",
  fontSize: "0.9375rem",
  fontFamily: "var(--font-montserrat), ui-sans-serif, system-ui, sans-serif",
  fontFamilyButtons:
    "var(--font-montserrat), ui-sans-serif, system-ui, sans-serif",
} as const;

/** ظلال وحلقات تركيز مبنية على العلامة */
export const CLERK_BRAND_FOCUS_RING =
  "0 0 0 3px color-mix(in oklab, var(--cb-brand-500) 28%, transparent)";
