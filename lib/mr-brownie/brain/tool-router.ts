import type { IntentEngineResult } from "@/lib/mr-brownie/brain/intent-engine";

export type ToolRouteDecision = {
  tool: "search_products" | "gift_box_builder" | "cart_summary" | "track_order" | "none";
  reason: string;
};

const ROUTES: Array<{
  match: (intent: IntentEngineResult["primary"]) => boolean;
  tool: ToolRouteDecision["tool"];
  reason: string;
}> = [
  {
    match: (i) => i === "order_status",
    tool: "track_order",
    reason: "User needs order status — guide to /track and account orders.",
  },
  {
    match: (i) =>
      i === "gift_request" || i === "fast_gift" || i === "custom_request",
    tool: "gift_box_builder",
    reason: "Gift intent — builder or curated boxes.",
  },
  {
    match: (i) => i === "cart_help",
    tool: "cart_summary",
    reason: "Cart intent — summarize lines and shipping gap.",
  },
  {
    match: (i) =>
      i === "product_browse" || i === "budget" || i === "pairing" || i === "general",
    tool: "search_products",
    reason: "Shopping intent — keyword catalog search.",
  },
];

/** Tool Decision Engine — يحدد الأداة الأساسية قبل التنفيذ */
export function routeTools(intent: IntentEngineResult): ToolRouteDecision[] {
  const decisions: ToolRouteDecision[] = [];
  for (const route of ROUTES) {
    if (route.match(intent.primary)) {
      decisions.push({ tool: route.tool, reason: route.reason });
    }
  }
  if (!decisions.length) {
    decisions.push({
      tool: "search_products",
      reason: "Default catalog search for ambiguous intent.",
    });
  }
  return decisions;
}

export function toolsToExecuteFromRoutes(
  routes: ToolRouteDecision[],
  intentTools: IntentEngineResult["tools_to_run"],
): IntentEngineResult["tools_to_run"] {
  const set = new Set<IntentEngineResult["tools_to_run"][number]>();
  for (const r of routes) {
    if (r.tool === "search_products") set.add("search_products");
    if (r.tool === "gift_box_builder") set.add("gift_box_builder");
    if (r.tool === "cart_summary") set.add("cart_summary");
  }
  for (const t of intentTools) set.add(t);
  return [...set];
}
