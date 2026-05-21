/**
 * Cookie Bite — Playful Luxury design tokens (JS export)
 * Single source of truth; mirrors CSS variables in app/styles/playful-luxury.css
 */

export const playfulLuxuryColors = {
  cream: "#F8F5EE",
  white: "#FFFFFF",
  creamDark: "#F0EBE1",
  caramel: "#D2A47B",
  caramelDark: "#B8895F",
  softGold: "#C8B59F",
  pastelPink: "#F5D9D9",
  pastelPeach: "#F5E8D9",
  pastelMint: "#D9F5E8",
  textPrimary: "#2B2B2B",
  textSecondary: "#6B6B6B",
  textMuted: "#9CA3AF",
  textOnDark: "#FFFFFF",
  border: "rgba(210, 164, 123, 0.25)",
  borderSoft: "rgba(43, 43, 43, 0.08)",
  whatsapp: "#25D366",
} as const;

export const playfulLuxuryGradients = {
  warm: "linear-gradient(135deg, #F8F5EE 0%, #F5E8D9 100%)",
  blush: "linear-gradient(135deg, #F8F5EE 0%, #F5D9D9 100%)",
  mint: "linear-gradient(135deg, #F8F5EE 0%, #D9F5E8 100%)",
  premium: "linear-gradient(135deg, #D2A47B 0%, #C8B59F 100%)",
  hero: "linear-gradient(160deg, #F8F5EE 0%, #F5E8D9 50%, #F5D9D9 100%)",
} as const;

export const playfulLuxuryRadii = {
  sm: "8px",
  md: "14px",
  lg: "20px",
  xl: "32px",
  pill: "9999px",
} as const;

export const playfulLuxuryShadows = {
  card: "0 2px 16px rgba(139, 90, 43, 0.08)",
  hover: "0 6px 32px rgba(139, 90, 43, 0.14)",
  nav: "0 1px 12px rgba(43, 43, 43, 0.06)",
} as const;

export const playfulLuxuryMotion = {
  fast: "150ms ease",
  base: "250ms ease",
  smooth: "400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
} as const;

/** Tailwind / chart usage */
export const brandScale = {
  50: "#fdf3ea",
  100: "#fae3cf",
  200: "#f4c7a0",
  300: "#eaa570",
  400: "#dd8447",
  500: playfulLuxuryColors.caramel,
  600: playfulLuxuryColors.caramelDark,
  700: "#84441b",
  800: "#663316",
  900: "#4a2510",
} as const;

export const designTokens = {
  colors: playfulLuxuryColors,
  gradients: playfulLuxuryGradients,
  radii: playfulLuxuryRadii,
  shadows: playfulLuxuryShadows,
  motion: playfulLuxuryMotion,
  brandScale,
  metaThemeColor: playfulLuxuryColors.cream,
} as const;

export default designTokens;
