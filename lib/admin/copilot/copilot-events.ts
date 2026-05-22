/** Client-side event when Mrs. Cookie mutates admin data — dashboards can refresh. */

export const COPILOT_REFRESH_EVENT = "cookie-bite:copilot-refresh";

export type CopilotRefreshDetail = {
  module: "products" | "orders" | "customers" | "discounts" | "dashboard";
  action?: string;
};

export function dispatchCopilotRefresh(detail: CopilotRefreshDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COPILOT_REFRESH_EVENT, { detail }));
}

const TOOL_MODULE: Record<string, CopilotRefreshDetail["module"]> = {
  add_product: "products",
  edit_product: "products",
  delete_product: "products",
  list_products: "products",
  create_product: "products",
  update_product: "products",
  update_product_stock: "products",
  manage_orders: "orders",
  update_order_status: "orders",
  cancel_order: "orders",
  manage_users: "customers",
  create_discount: "discounts",
};

export function moduleFromCopilotTool(toolName: string): CopilotRefreshDetail["module"] | null {
  return TOOL_MODULE[toolName] ?? null;
}
