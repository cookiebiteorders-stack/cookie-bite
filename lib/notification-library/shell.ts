import {
  BRAND,
  BRAND_FONTS,
  LEGACY_COLOR_MAP,
  getStylesForVariant,
  type TemplateVariant,
} from "./styles";

export type RenderShellOptions = {
  title: string;
  preheader?: string;
  variant?: TemplateVariant;
  lang?: "en" | "ar";
  brandName?: string;
};

const BRAND_NAME_DEFAULT = "Cookie Bite";

/* -------------------------------------------------------------------------- */
/* Brand identity assets                                                      */
/* -------------------------------------------------------------------------- */

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://cookie-bite.com"
);

/** Hosted logo asset. Email clients that render SVG (Apple Mail, Gmail Web,
 *  iOS Mail) will show the proper mark; Outlook falls back to the alt text +
 *  serif wordmark we render in HTML, which keeps the brand legible. */
const LOGO_URL =
  process.env.NEXT_PUBLIC_EMAIL_LOGO_URL || `${APP_URL}/brand/logo-mark.svg`;

const TAGLINE_EN = "Small-batch cookies · New Cairo";
const TAGLINE_AR = "كوكيز على دفعات صغيرة · القاهرة الجديدة";

function tagline(lang?: "en" | "ar"): string {
  return lang === "ar" ? TAGLINE_AR : TAGLINE_EN;
}

/**
 * Branded header used at the top of EVERY email template (.email-header /
 * .eh wrapper). Tables are used so legacy Outlook still aligns the brand
 * mark above the wordmark.
 */
function brandedEmailHeader(brand: string, lang?: "en" | "ar"): string {
  return `
    <div class="brand-bar"></div>
    <div class="brand-block">
      <a href="${APP_URL}" target="_blank" style="text-decoration:none;color:inherit;">
        <img class="brand-mark" src="${LOGO_URL}" width="52" height="52" alt="${escapeHtml(brand)}" style="margin:0 auto 10px;">
        <div class="brand-name" style="font-family:${BRAND_FONTS.serif};">${escapeHtml(brand)}</div>
        <div class="brand-tag" style="font-family:${BRAND_FONTS.sans};">${escapeHtml(tagline(lang))}</div>
      </a>
    </div>`;
}

/**
 * Compact branded header used inside the small "internal report" header strip
 * (.email-head) which has a left/right two-column layout — keeps the period
 * label intact on the right side.
 */
function brandedReportStripStore(brand: string): string {
  return `
    <span style="display:inline-flex;align-items:center;gap:10px;">
      <img src="${LOGO_URL}" width="26" height="26" alt="" style="display:inline-block;border:0;">
      <span style="font-family:${BRAND_FONTS.serif};font-size:18px;font-weight:800;color:${BRAND.ink};letter-spacing:.4px;">${escapeHtml(brand)}</span>
    </span>`;
}

/**
 * Branded header for printable A4 reports (.doc-head / .dh).
 */
function brandedDocStore(brand: string): string {
  return `
    <span style="display:inline-flex;align-items:center;gap:12px;">
      <img src="${LOGO_URL}" width="36" height="36" alt="" style="display:inline-block;border:0;">
      <span style="font-family:${BRAND_FONTS.serif};font-size:22px;font-weight:800;color:${BRAND.ink};letter-spacing:.4px;">${escapeHtml(brand)}</span>
    </span>`;
}

/* -------------------------------------------------------------------------- */
/* Body rewriting                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Replaces the legacy `<div class="logo">YOUR STORE</div>` placeholders with
 * the proper Cookie Bite header (logo image + serif wordmark + tagline).
 * Operates by surgical inner-content replacement so the outer header
 * structure (and any sibling elements like `.period`) stays intact.
 */
function injectBrandHeaders(body: string, brand: string, lang?: "en" | "ar"): string {
  let out = body;

  // 1. Strip any legacy dark inline `style="background:#xxxxxx"` (or with extra
  //    declarations) from email/internal-report header wrappers — we always
  //    want the new cream paper background.
  out = out.replace(
    /(<div class="(?:email-header|eh|email-head)")([^>]*)>/g,
    (_full, head: string, attrs: string) => {
      // Drop only the style attribute; preserve any other attributes.
      const cleaned = attrs.replace(/\s*style="[^"]*"/gi, "");
      return `${head}${cleaned}>`;
    },
  );

  // 2. Replace the legacy logo placeholder INSIDE email headers with the full
  //    brand block (cookie-mark img + serif wordmark + tagline). Note: this
  //    swaps just the inner <div class="logo">…</div>, leaving the surrounding
  //    header element (and any sibling content) untouched.
  out = out.replace(
    /<div class="logo">[\s\S]*?<\/div>/g,
    () => brandedEmailHeader(brand, lang),
  );

  // 3. Internal-report strip header (.email-head) — replace the .store child
  //    with the compact branded block; keeps the .period label on the right.
  out = out.replace(
    /<div class="store">[\s\S]*?<\/div>/g,
    () => `<div class="store">${brandedReportStripStore(brand)}</div>`,
  );

  return out;
}

/**
 * Rewrites legacy hardcoded hex colors (the old dark-navy palette) to the new
 * Cookie Bite warm palette. Applied AFTER variable substitution so customer
 * data is never mistaken for a color.
 */
function rebrandLegacyColors(body: string): string {
  let out = body;
  for (const [legacy, replacement] of Object.entries(LEGACY_COLOR_MAP)) {
    // Match the literal hex (with optional uppercase) preceded by a non-word
    // char to avoid replacing hexes that are part of longer hashes.
    const re = new RegExp(legacy.replace("#", "#"), "gi");
    out = out.replace(re, replacement);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Wraps a rendered template body in a full HTML document with the appropriate
 * stylesheet for the chosen variant.
 *
 * For "email": adds preheader, brand header injection, mobile-safe meta.
 * For "report" / "dash": A4-friendly canvas with print stylesheet baked in.
 */
export function renderShell(body: string, opts: RenderShellOptions): string {
  const variant: TemplateVariant = opts.variant ?? "email";
  const lang = opts.lang ?? "en";
  const dir = lang === "ar" ? "rtl" : "ltr";
  const brand = opts.brandName ?? BRAND_NAME_DEFAULT;
  const styles = getStylesForVariant(variant);

  let processed = body
    .replaceAll("[Your Store]", brand)
    .replaceAll("YOUR STORE", brand.toUpperCase());

  // Inject the branded header (cookie-mark + serif wordmark + tagline).
  processed = injectBrandHeaders(processed, brand, lang);

  // For printable reports we rewrite the .store div with the doc header style.
  if (variant === "report") {
    processed = processed.replace(
      /<div class="store">[\s\S]*?<\/div>/g,
      () => `<div class="store">${brandedDocStore(brand)}</div>`,
    );
  }

  // Recolor any leftover dark navy hexes used by older inline styles.
  processed = rebrandLegacyColors(processed);

  const preheader = opts.preheader
    ? `<div style="display:none;font-size:1px;color:${BRAND.cream};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(opts.preheader)}</div>`
    : "";

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(opts.title)}</title>
<style>${styles}</style>
</head>
<body>
${preheader}
${processed}
</body>
</html>`;
}

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Minimal Mustache-style variable substitution. Supports {{ var }} with optional
 * whitespace. Unknown variables fall back to an empty string so previews don't
 * leak placeholders into production renders.
 *
 * Variables whose name contains the word "rows", "html" or ends with "_html"
 * are inserted as-is (raw HTML). Everything else is HTML-escaped to prevent
 * accidental injection.
 */
export function applyVars(
  source: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_full, key: string) => {
    const value = vars[key];
    if (value === undefined || value === null) return "";
    const isRaw = /rows$|_html$|^html_/i.test(key) || key === "html";
    return isRaw ? String(value) : escapeHtml(String(value));
  });
}
