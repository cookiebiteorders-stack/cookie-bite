import type { SupabaseClient } from "@supabase/supabase-js";

export type PromoRuleKey = "cart_total" | "cookies_only" | "first_order" | "vip_only";

export type PromoKind =
  | "percent"
  | "fixed"
  | "shipping"
  | "bogo"
  | "bundle"
  | "vip"
  | "first-order"
  | "seasonal"
  | "loyalty";

export type PromoRulesMeta = {
  mode: "AND" | "OR";
  keys: PromoRuleKey[];
};

export type PromoMetadata = {
  kind?: PromoKind;
  campaign_tag?: string;
  rules?: PromoRulesMeta;
  free_shipping?: boolean;
  notes?: string;
};

export const RULE_LABEL_TO_KEY: Record<string, PromoRuleKey> = {
  cart_total: "cart_total",
  cookies_only: "cookies_only",
  first_order: "first_order",
  vip_only: "vip_only",
};

export function parsePromoMetadata(raw: unknown): PromoMetadata {
  if (!raw || typeof raw !== "object") return {};
  return raw as PromoMetadata;
}

export function generatePromoCode(prefix = "COOKIE"): string {
  const base = prefix.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8) || "COOKIE";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

export type BuilderPayloadInput = {
  builderType: PromoKind;
  code: string;
  value: number;
  minOrder: number;
  maxUses?: number;
  expiresAt?: string;
  startsAt?: string;
  campaignTag: string;
  ruleMode: "AND" | "OR";
  ruleKeys: PromoRuleKey[];
  productIds: string[];
  maxUsesPerUser?: number;
};

export type BuilderPayloadResult = {
  type: "percent" | "fixed";
  value: number;
  min_order_amount_egp: number;
  max_uses?: number;
  max_uses_per_user: number;
  valid_from?: string;
  valid_until?: string | null;
  applicable_product_ids: string[];
  metadata: PromoMetadata;
};

export function buildPromoFromBuilder(input: BuilderPayloadInput): BuilderPayloadResult {
  const ruleKeys = [...new Set(input.ruleKeys)];
  let minOrder = Math.max(0, input.minOrder);
  if (ruleKeys.includes("cart_total") && minOrder < 250) minOrder = 250;

  const metadata: PromoMetadata = {
    kind: input.builderType,
    campaign_tag: input.campaignTag.trim() || undefined,
    rules: ruleKeys.length ? { mode: input.ruleMode, keys: ruleKeys } : undefined,
  };

  let type: "percent" | "fixed" = "percent";
  let value = input.value;

  switch (input.builderType) {
    case "fixed":
      type = "fixed";
      break;
    case "shipping":
      metadata.free_shipping = true;
      type = "percent";
      value = Math.min(100, value > 0 ? value : 100);
      break;
    case "bogo":
      metadata.notes = "BOGO — applied as cart percent discount";
      type = "percent";
      value = Math.min(50, value > 0 ? value : 15);
      break;
    case "bundle":
      metadata.notes = "Bundle offer — restrict to selected products when set";
      type = "percent";
      break;
    case "vip":
      if (!ruleKeys.includes("vip_only")) ruleKeys.push("vip_only");
      metadata.rules = { mode: input.ruleMode, keys: ruleKeys };
      type = "percent";
      value = Math.min(30, value > 0 ? value : 12);
      break;
    case "first-order":
      if (!ruleKeys.includes("first_order")) ruleKeys.push("first_order");
      metadata.rules = { mode: input.ruleMode, keys: ruleKeys };
      type = "percent";
      value = Math.min(25, value > 0 ? value : 10);
      break;
    case "loyalty":
      type = "percent";
      value = Math.min(20, value > 0 ? value : 8);
      break;
    case "seasonal":
      type = "percent";
      break;
    case "percent":
    default:
      type = "percent";
      break;
  }

  if (type === "percent") value = Math.min(100, Math.max(0.01, value));
  else value = Math.max(0.01, value);

  return {
    type,
    value,
    min_order_amount_egp: minOrder,
    max_uses: input.maxUses,
    max_uses_per_user: input.maxUsesPerUser ?? 1,
    valid_from: input.startsAt,
    valid_until: input.expiresAt ?? null,
    applicable_product_ids: input.productIds,
    metadata,
  };
}

export async function resolveCookieProductIds(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data } = await supabase
    .from("products")
    .select("id,category")
    .eq("is_active", true)
    .limit(500);

  const ids = (data ?? [])
    .filter((p) => {
      const cat = String(p.category ?? "").toLowerCase();
      return cat.includes("cookie") || cat.includes("كوك") || cat === "cookies";
    })
    .map((p) => p.id as string);

  if (ids.length > 0) return ids;
  return (data ?? []).slice(0, 12).map((p) => p.id as string);
}
