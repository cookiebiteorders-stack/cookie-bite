/** Input shape for a single checkout line when persisting order_items. */
export type CheckoutOrderLineInput = {
  slug: string;
  name: string;
  unitPrice: number;
  quantity: number;
  selectedAddons?: Record<string, unknown>[];
  addonsTotalUnitPrice?: number;
  finalUnitPrice?: number;
  productSnapshot?: Record<string, unknown> | null;
  variantId?: string | null;
  variantSnapshot?: Record<string, unknown> | null;
};

/**
 * Builds a row for `order_items.insert()` using the canonical production schema.
 * One row per cart line (products, gift boxes, bundle offers, add-ons).
 */
export function buildOrderItemInsertRow(
  orderId: string,
  line: CheckoutOrderLineInput,
  productUuid: string | null,
): Record<string, unknown> {
  const quantity = line.quantity;
  const unitPrice = line.unitPrice;
  const finalUnitPrice = Number(line.finalUnitPrice ?? line.unitPrice);
  const addonsTotalEgp = Number(line.addonsTotalUnitPrice ?? 0) * quantity;
  const lineTotalEgp = finalUnitPrice * quantity;

  const productSnapshot: Record<string, unknown> = {
    slug: line.slug,
    name: line.name,
    unit_price_egp: unitPrice,
    final_unit_price_egp: finalUnitPrice,
    ...(line.productSnapshot ?? {}),
  };
  if (line.selectedAddons?.length) {
    productSnapshot.addons = line.selectedAddons;
  }
  if (line.variantSnapshot) {
    productSnapshot.variant = line.variantSnapshot;
  }

  const row: Record<string, unknown> = {
    order_id: orderId,
    product_id: productUuid,
    product_name: line.name.slice(0, 500),
    slug: line.slug,
    unit_price_egp: unitPrice,
    unit_price: unitPrice,
    quantity,
    total_price_egp: lineTotalEgp,
    total_price: lineTotalEgp,
    final_total_egp: lineTotalEgp,
    selected_addons: line.selectedAddons ?? [],
    addons_total_egp: addonsTotalEgp,
    product_snapshot: productSnapshot,
  };

  if (line.variantId) {
    row.variant_id = line.variantId;
  }
  if (line.variantSnapshot) {
    row.variant_snapshot = line.variantSnapshot;
  }

  return row;
}
