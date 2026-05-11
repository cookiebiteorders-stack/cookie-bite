function hexToRgb(hexColor: string): { r: number; g: number; b: number } | null {
  const hex = hexColor.replace("#", "").trim();
  if (![3, 6].includes(hex.length)) return null;
  const normalized =
    hex.length === 3 ? hex.split("").map((c) => `${c}${c}`).join("") : hex;
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return null;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function luminanceChannel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(r: number, g: number, b: number): number {
  return (
    0.2126 * luminanceChannel(r) +
    0.7152 * luminanceChannel(g) +
    0.0722 * luminanceChannel(b)
  );
}

export function getTextColor(bgHexColor: string): "#FAFAF9" | "#1C1917" {
  const rgb = hexToRgb(bgHexColor);
  if (!rgb) return "#1C1917";
  const l = relativeLuminance(rgb.r, rgb.g, rgb.b);
  return l < 0.36 ? "#FAFAF9" : "#1C1917";
}

