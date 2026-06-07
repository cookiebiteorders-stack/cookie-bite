export type LowStockProductRow = {
  name: string;
  sku: string | null;
  stock: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildLowStockTableRows(products: LowStockProductRow[]): string {
  if (products.length === 0) {
    return '<tr><td colspan="3" style="text-align:center;color:#888;">—</td></tr>';
  }
  return products
    .map((p) => {
      const stockStyle =
        p.stock <= 3
          ? ' style="color:#c62828;font-weight:700;"'
          : ' style="color:#f57c00;font-weight:700;"';
      return `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.sku ?? "—")}</td><td${stockStyle}>${p.stock}</td></tr>`;
    })
    .join("");
}
