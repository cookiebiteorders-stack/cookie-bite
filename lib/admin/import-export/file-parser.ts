import ExcelJS from "exceljs";
import { parseCsv } from "@/lib/csv/parse-csv";
import type { ImportFileType, ParsedSheet } from "@/lib/admin/import-export/types";
import { pythonApiAvailable } from "@/lib/python-api";

function gridToSheet(grid: string[][]): ParsedSheet {
  if (!grid.length) return { headers: [], rows: [] };
  const headers = grid[0]!.map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < grid.length; i++) {
    const line = grid[i]!;
    if (!line.some((c) => c.trim())) continue;
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) rec[h] = (line[idx] ?? "").trim();
    });
    rows.push(rec);
  }
  return { headers, rows };
}

export function detectFileType(fileName: string, mime?: string | null): ImportFileType | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv") || mime === "text/csv") return "csv";
  if (lower.endsWith(".xlsx") || mime?.includes("spreadsheet")) return "xlsx";
  if (lower.endsWith(".pdf") || mime === "application/pdf") return "pdf";
  return null;
}

export async function parseTabularBuffer(buffer: Buffer, fileType: "csv" | "xlsx"): Promise<ParsedSheet> {
  if (fileType === "csv") {
    const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
    return gridToSheet(parseCsv(text));
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { headers: [], rows: [] };
  
  const grid: string[][] = [];
  worksheet.eachRow((row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      values.push(cell.value == null ? "" : String(cell.value).trim());
    });
    grid.push(values);
  });
  
  const normalized = grid.map((row) =>
    row.map((cell) => (cell == null ? "" : String(cell).trim())),
  );
  return gridToSheet(normalized);
}

export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedSheet> {
  const base = process.env.PYTHON_API_URL?.trim().replace(/\/$/, "");
  if (!base) {
    throw new Error(
      "خدمة PDF غير متاحة. شغّل Python API (npm run python:up) واضبط PYTHON_API_URL.",
    );
  }
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
    "import.pdf",
  );
  const res = await fetch(`${base}/import/parse-pdf`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `فشل تحليل PDF (${res.status})`);
  }
  const data = (await res.json()) as {
    headers?: string[];
    rows?: Record<string, string>[];
  };
  return {
    headers: data.headers ?? [],
    rows: data.rows ?? [],
  };
}

export async function parseImportBuffer(
  buffer: Buffer,
  fileType: ImportFileType,
): Promise<ParsedSheet> {
  if (fileType === "pdf") return parsePdfBuffer(buffer);
  return parseTabularBuffer(buffer, fileType);
}

export function isPdfParsingAvailable(): boolean {
  return pythonApiAvailable();
}
