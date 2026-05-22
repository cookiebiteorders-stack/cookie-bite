import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";
import type { ExportFormat } from "@/lib/admin/import-export/types";
import { EXPORT_MIME } from "@/lib/admin/import-export/constants";

export function buildCsvExport(
  columns: string[],
  rows: Record<string, unknown>[],
): { buffer: Buffer; mimeType: string; fileName: string } {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    columns.join(","),
    ...rows.map((r) => columns.map((c) => escape(r[c])).join(",")),
  ];
  const buffer = Buffer.from("\uFEFF" + lines.join("\n"), "utf-8");
  return {
    buffer,
    mimeType: EXPORT_MIME.csv!,
    fileName: `export-${Date.now()}.csv`,
  };
}

export function buildXlsxExport(
  columns: string[],
  rows: Record<string, unknown>[],
  sheetName = "Data",
): { buffer: Buffer; mimeType: string; fileName: string } {
  const data = [columns, ...rows.map((r) => columns.map((c) => r[c] ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return {
    buffer: out,
    mimeType: EXPORT_MIME.xlsx!,
    fileName: `export-${Date.now()}.xlsx`,
  };
}

export async function buildPdfExport(
  title: string,
  columns: string[],
  rows: Record<string, unknown>[],
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => {
      resolve({
        buffer: Buffer.concat(chunks),
        mimeType: EXPORT_MIME.pdf!,
        fileName: `export-${Date.now()}.pdf`,
      });
    });
    doc.on("error", reject);

    doc.fontSize(16).text(title, { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor("#555").text(new Date().toLocaleString("ar-EG"));
    doc.moveDown(1);

    const maxRows = Math.min(rows.length, 80);
    const colWidth = (doc.page.width - 80) / Math.min(columns.length, 6);

    doc.fontSize(8).fillColor("#000");
    columns.slice(0, 6).forEach((col, i) => {
      doc.text(col, 40 + i * colWidth, doc.y, { width: colWidth - 4, continued: false });
    });
    doc.moveDown(0.3);
    doc.strokeColor("#ddd").moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.3);

    for (let r = 0; r < maxRows; r++) {
      const row = rows[r]!;
      if (doc.y > doc.page.height - 60) {
        doc.addPage();
      }
      const y = doc.y;
      columns.slice(0, 6).forEach((col, i) => {
        const val = row[col];
        doc.text(val == null ? "" : String(val).slice(0, 40), 40 + i * colWidth, y, {
          width: colWidth - 4,
          lineBreak: false,
        });
      });
      doc.moveDown(0.55);
    }

    if (rows.length > maxRows) {
      doc.moveDown(0.5);
      doc.fillColor("#888").fontSize(8).text(`… و ${rows.length - maxRows} صف إضافي (صدّر CSV/XLSX للملف الكامل)`);
    }

    doc.end();
  });
}

export async function buildExportFile(
  format: ExportFormat,
  title: string,
  columns: string[],
  rows: Record<string, unknown>[],
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  if (format === "csv") return buildCsvExport(columns, rows);
  if (format === "xlsx") return buildXlsxExport(columns, rows, title);
  return buildPdfExport(title, columns, rows);
}
