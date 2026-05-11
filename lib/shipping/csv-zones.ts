import type { ShippingZoneRow } from "@/lib/shipping/types";

/** تصدير CSV UTF-8 مع BOM لـ Excel */
export function zonesToCsv(zones: ShippingZoneRow[]): string {
  const header =
    "name,cities,base_fee_egp,free_shipping_threshold_egp,eta_min_days,eta_max_days,is_active,sort_order";
  const rows = zones.map((z) => {
    const cities = z.cities.join("|");
    const free =
      z.free_shipping_threshold_egp == null
        ? ""
        : String(z.free_shipping_threshold_egp);
    return [
      escapeCsv(z.name),
      escapeCsv(cities),
      z.base_fee_egp,
      free,
      z.eta_min_days,
      z.eta_max_days,
      z.is_active ? "true" : "false",
      z.sort_order ?? 0,
    ].join(",");
  });
  return `\ufeff${header}\n${rows.join("\n")}\n`;
}

function escapeCsv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export type CsvImportRow = {
  name: string;
  cities: string[];
  base_fee_egp: number;
  free_shipping_threshold_egp: number | null;
  eta_min_days: number;
  eta_max_days: number;
  is_active: boolean;
};

export function parseZonesCsv(text: string): { ok: true; rows: CsvImportRow[] } | { ok: false; error: string } {
  const lines = text.replace(/^\ufeff/, "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { ok: false, error: "CSV must include a header row and at least one data row." };
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (key: string) => header.indexOf(key);
  const nameI = idx("name");
  const citiesI = idx("cities");
  const baseI = idx("base_fee_egp");
  const freeI = idx("free_shipping_threshold_egp");
  const minI = idx("eta_min_days");
  const maxI = idx("eta_max_days");
  const actI = idx("is_active");
  if (nameI < 0 || citiesI < 0 || baseI < 0) {
    return { ok: false, error: "CSV must include columns: name, cities, base_fee_egp" };
  }
  const rows: CsvImportRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = splitCsvLine(lines[li]);
    const name = (cells[nameI] ?? "").trim();
    if (!name) continue;
    const citiesRaw = (cells[citiesI] ?? "").trim();
    const cities = citiesRaw
      .split(/[|,]/)
      .map((c) => c.trim())
      .filter(Boolean);
    const base = Number((cells[baseI] ?? "0").replace(/,/g, ""));
    const freeCell = freeI >= 0 ? (cells[freeI] ?? "").trim() : "";
    let free_shipping_threshold_egp: number | null = null;
    if (freeCell !== "") {
      const n = Number(freeCell.replace(/,/g, ""));
      if (Number.isFinite(n)) free_shipping_threshold_egp = n;
    }
    const etaMin = minI >= 0 ? Math.max(0, Math.floor(Number(cells[minI] ?? 1))) : 1;
    const etaMax = maxI >= 0 ? Math.max(0, Math.floor(Number(cells[maxI] ?? 3))) : 3;
    const active =
      actI >= 0 ? String(cells[actI] ?? "true").toLowerCase() === "true" : true;
    if (!Number.isFinite(base) || base < 0) continue;
    rows.push({
      name,
      cities,
      base_fee_egp: base,
      free_shipping_threshold_egp,
      eta_min_days: etaMin,
      eta_max_days: Math.max(etaMin, etaMax),
      is_active: active,
    });
  }
  if (!rows.length) return { ok: false, error: "No valid data rows found." };
  return { ok: true, rows };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
