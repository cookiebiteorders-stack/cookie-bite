/**
 * Renders HTML to PDF using Playwright when available (dev/CI with browsers installed).
 * Returns null if the engine is unavailable — callers should fall back to PDFKit.
 */
export async function htmlToPdfBuffer(
  html: string,
  options?: { format?: "A4"; printBackground?: boolean },
): Promise<Buffer | null> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      format: options?.format ?? "A4",
      printBackground: options?.printBackground ?? true,
      margin: { top: "10mm", right: "10mm", bottom: "12mm", left: "10mm" },
    });
    await browser.close();
    return Buffer.from(pdf);
  } catch {
    return null;
  }
}
