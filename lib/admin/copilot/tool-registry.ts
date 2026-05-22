/**
 * Master tool registry — SaaS-grade operator tools for Mrs. Cookie.
 * Source schema: master-tools.json
 */

import type { FunctionDeclaration } from "@google/generative-ai";
import masterTools from "@/lib/admin/copilot/master-tools.json";

const OBJ = "OBJECT" as const;
const STR = "STRING" as const;
const NUM = "NUMBER" as const;
const BOOL = "BOOLEAN" as const;
const ARR = "ARRAY" as const;

type JsonSchemaProperty = {
  type?: string;
  description?: string;
  enum?: string[];
  items?: { type?: string };
  properties?: Record<string, JsonSchemaProperty>;
};

type MasterToolDef = {
  name: string;
  category?: string;
  destructive?: boolean;
  previewDefault?: boolean;
  api?: string;
  description: string;
  parameters: {
    type: string;
    required?: string[];
    properties?: Record<string, JsonSchemaProperty>;
  };
};

export type MasterToolMeta = {
  name: string;
  category: string;
  destructive: boolean;
  previewDefault: boolean;
  api: string | null;
};

function mapJsonType(t?: string): string {
  switch (t) {
    case "string":
      return STR;
    case "number":
    case "integer":
      return NUM;
    case "boolean":
      return BOOL;
    case "array":
      return ARR;
    case "object":
      return OBJ;
    default:
      return STR;
  }
}

function toGeminiProperties(
  props?: Record<string, JsonSchemaProperty>,
): Record<string, { type: string; description?: string; enum?: string[]; items?: { type: string } }> {
  if (!props) return {};
  const out: Record<string, { type: string; description?: string; enum?: string[]; items?: { type: string } }> =
    {};
  for (const [key, val] of Object.entries(props)) {
    if (val.type === "object" && val.properties) {
      out[key] = {
        type: OBJ,
        description: val.description,
        ...(Object.keys(val.properties).length
          ? {
              properties: toGeminiProperties(val.properties),
            }
          : {}),
      } as { type: string; description?: string };
      continue;
    }
    out[key] = {
      type: mapJsonType(val.type),
      description: val.description,
      ...(val.enum ? { enum: val.enum } : {}),
      ...(val.items?.type ? { items: { type: mapJsonType(val.items.type) } } : {}),
    };
  }
  return out;
}

const MASTER_LIST = (masterTools as unknown as { tools: MasterToolDef[] }).tools;

export const MASTER_TOOL_META: Record<string, MasterToolMeta> = Object.fromEntries(
  MASTER_LIST.map((t) => [
    t.name,
    {
      name: t.name,
      category: t.category ?? "general",
      destructive: Boolean(t.destructive),
      previewDefault: Boolean(t.previewDefault),
      api: t.api ?? null,
    },
  ]),
);

/** Legacy internal names still accepted by runTool */
export const TOOL_ALIASES: Record<string, string> = {
  create_product: "add_product",
  update_product: "edit_product",
  search_products: "list_products",
};

export function resolveToolName(name: string): string {
  return TOOL_ALIASES[name] ?? name;
}

export function masterToolsAsGemini(): FunctionDeclaration[] {
  return MASTER_LIST.map((t) => ({
    name: t.name,
    description: [t.description, t.api ? `API: ${t.api}` : null, t.destructive ? "DESTRUCTIVE" : null]
      .filter(Boolean)
      .join(" — "),
    parameters: {
      type: OBJ,
      properties: toGeminiProperties(t.parameters.properties),
      ...(t.parameters.required?.length ? { required: t.parameters.required } : {}),
    },
  })) as unknown as FunctionDeclaration[];
}

/** Read/analytics tools kept from v1 operator */
export const LEGACY_READ_TOOL_NAMES = [
  "get_dashboard_summary",
  "search_orders",
  "get_order_details",
  "search_customers",
  "get_top_products",
  "get_sales_report",
  "list_discounts",
  "list_recent_audit_logs",
  "cancel_order",
  "update_product_stock",
  "update_order_status",
  "create_discount",
] as const;

export function operatorPrinciplesBlock(): string {
  const principles = (masterTools as { operator?: { principles?: string[] } }).operator?.principles ?? [];
  return principles.map((p) => `- ${p}`).join("\n");
}

export function masterToolCatalogForPrompt(): string {
  return MASTER_LIST.map(
    (t) =>
      `${t.name} [${t.category ?? "general"}]${t.destructive ? " ⚠" : ""}${t.previewDefault ? " (preview)" : ""}`,
  ).join("\n");
}
