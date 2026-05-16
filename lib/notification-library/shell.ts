import { BRAND, getStylesForVariant, type TemplateVariant } from "./styles";

export type RenderShellOptions = {
  title: string;
  preheader?: string;
  variant?: TemplateVariant;
  lang?: "en" | "ar";
  brandName?: string;
};

const BRAND_NAME_DEFAULT = "Cookie Bite";

/**
 * Wraps a rendered template body in a full HTML document with the appropriate
 * stylesheet for the chosen variant.
 *
 * For "email": adds preheader, brand replacement, mobile-safe meta.
 * For "report" / "dash": A4-friendly canvas with print stylesheet baked in.
 */
export function renderShell(body: string, opts: RenderShellOptions): string {
  const variant: TemplateVariant = opts.variant ?? "email";
  const lang = opts.lang ?? "en";
  const dir = lang === "ar" ? "rtl" : "ltr";
  const brand = opts.brandName ?? BRAND_NAME_DEFAULT;
  const styles = getStylesForVariant(variant);

  const replacedBody = body
    .replaceAll("[Your Store]", brand)
    .replaceAll("YOUR STORE", brand.toUpperCase());

  const preheader = opts.preheader
    ? `<div style="display:none;font-size:1px;color:${BRAND.paper};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(opts.preheader)}</div>`
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
${replacedBody}
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
 */
export function applyVars(
  source: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_full, key: string) => {
    const value = vars[key];
    if (value === undefined || value === null) return "";
    return escapeHtml(String(value));
  });
}
