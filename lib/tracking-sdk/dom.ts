/**
 * Small helpers used by click/scroll/form trackers to describe DOM elements
 * in a way that is safe to send across the wire (no PII by default).
 */

const MAX_TEXT_LEN = 100;
const PII_INPUT_TYPES = new Set([
  "password",
  "email",
  "tel",
  "credit-card",
  "cc-number",
  "cc-csc",
]);

export function elementSelector(el: Element): string {
  if (!(el instanceof Element)) return "";
  if (el.id) return `#${el.id}`;
  if (el instanceof HTMLElement && el.dataset.trackId) {
    return `[data-track-id="${el.dataset.trackId}"]`;
  }
  const tag = el.tagName.toLowerCase();
  const classes =
    typeof el.className === "string" && el.className.trim()
      ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
      : "";
  return `${tag}${classes}`;
}

export function safeText(el: Element | null | undefined): string | null {
  if (!el) return null;
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > MAX_TEXT_LEN ? `${text.slice(0, MAX_TEXT_LEN)}…` : text;
}

export function isPiiInput(el: Element | null): boolean {
  if (!(el instanceof HTMLInputElement)) return false;
  if (PII_INPUT_TYPES.has(el.type)) return true;
  const name = (el.name ?? "").toLowerCase();
  return name.includes("password") || name.includes("card") || name.includes("cvv");
}

export function describeElement(el: Element | null | undefined): Record<string, unknown> {
  if (!el) return {};
  const target = el as HTMLElement;
  return {
    tag: target.tagName?.toLowerCase(),
    id: target.id || null,
    classes:
      typeof target.className === "string"
        ? target.className.split(/\s+/).filter(Boolean).slice(0, 6)
        : [],
    selector: elementSelector(target),
    text: safeText(target),
    href: target instanceof HTMLAnchorElement ? target.href : null,
    role: target.getAttribute?.("role") ?? null,
    data_track: target.dataset?.track ?? null,
  };
}
