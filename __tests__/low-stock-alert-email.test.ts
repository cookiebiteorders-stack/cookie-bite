import { buildLowStockTableRows } from "@/lib/admin/low-stock-table-rows";

describe("buildLowStockTableRows", () => {
  it("renders product rows with escaped html", () => {
    const html = buildLowStockTableRows([
      { name: "Cookie <Box>", sku: "SKU-1", stock: 2 },
    ]);
    expect(html).toContain("Cookie &lt;Box&gt;");
    expect(html).toContain("SKU-1");
    expect(html).toContain(">2</td>");
  });

  it("returns placeholder row when empty", () => {
    expect(buildLowStockTableRows([])).toContain("colspan");
  });
});
