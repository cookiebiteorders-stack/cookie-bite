import type { CustomerMemorySnapshot } from "@/lib/mr-brownie/fetch-customer-memory";

export type MemoryGraphNode = {
  id: string;
  type: "user" | "preference" | "behavior" | "order";
  label: string;
  value?: string;
};

export type MemoryGraphEdge = {
  from: string;
  to: string;
  relation: string;
};

export type ConversationMemoryGraph = {
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
};

export function buildConversationMemoryGraph(params: {
  displayName: string | null;
  loyaltyTier: string | null;
  memory: CustomerMemorySnapshot | null;
  userProfile: {
    favorite_product_names: string[];
    order_count: number;
    budget_signal: string;
    last_order_hint: string | null;
  } | null;
  conversationSummary: string;
}): ConversationMemoryGraph {
  const nodes: MemoryGraphNode[] = [
    { id: "user", type: "user", label: params.displayName ?? "guest" },
  ];
  const edges: MemoryGraphEdge[] = [];

  if (params.loyaltyTier) {
    nodes.push({
      id: "loyalty",
      type: "preference",
      label: "loyalty_tier",
      value: params.loyaltyTier,
    });
    edges.push({ from: "user", to: "loyalty", relation: "has_tier" });
  }

  if (params.userProfile?.budget_signal && params.userProfile.budget_signal !== "unknown") {
    nodes.push({
      id: "budget",
      type: "preference",
      label: "budget_signal",
      value: params.userProfile.budget_signal,
    });
    edges.push({ from: "user", to: "budget", relation: "prefers_budget" });
  }

  for (const [i, name] of (params.userProfile?.favorite_product_names ?? []).entries()) {
    const id = `product_${i}`;
    nodes.push({ id, type: "order", label: "bought_or_liked", value: name });
    edges.push({ from: "user", to: id, relation: "likes" });
  }

  if (params.userProfile?.last_order_hint) {
    nodes.push({
      id: "last_order",
      type: "order",
      label: "last_order",
      value: params.userProfile.last_order_hint.slice(0, 120),
    });
    edges.push({ from: "user", to: "last_order", relation: "recent_order" });
  }

  if (params.conversationSummary.trim()) {
    nodes.push({
      id: "session_topics",
      type: "behavior",
      label: "current_session",
      value: params.conversationSummary.slice(0, 300),
    });
    edges.push({ from: "user", to: "session_topics", relation: "discussed" });
  }

  return { nodes, edges };
}
