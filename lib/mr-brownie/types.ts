import type { UserRole } from "@/lib/admin/rbac";
import type { StoreFaqEntry } from "@/lib/ai/store-faq-knowledge";
import type {
  AiCatalogProduct,
  AiPromoOffer,
  WebsiteKnowledgeSnapshot,
} from "@/lib/ai/website-knowledge";
import type { CustomerMemorySnapshot } from "@/lib/mr-brownie/fetch-customer-memory";
import type { BrainPipelineMeta } from "@/lib/mr-brownie/brain/pipeline";
import type { MrBrownieSessionContext } from "@/lib/mr-brownie/page-intent";

/** Payload يُرسل للنموذج بعد تصفية الحقول حسب الدور */
export type MrBrownieContextPayload = {
  user: {
    id: string | null;
    role: UserRole | "guest";
    name: string | null;
    language: "ar" | "en" | "auto";
    loyalty_tier: string;
    past_orders_summary: string;
  };
  products: AiCatalogProduct[];
  catalog_meta: {
    total_active: number;
    shown_in_context: number;
    truncated: boolean;
    source: string;
    refreshed_at: string;
    note?: string;
  };
  website: WebsiteKnowledgeSnapshot;
  cart: {
    items: Array<{
      product_id: string;
      name: string;
      quantity: number;
      line_total_egp: number;
    }>;
    subtotal: number;
    applied_promo: null | { code: string; note: string };
  };
  offers: AiPromoOffer[];
  knowledge_base: {
    faq: StoreFaqEntry[];
    policies: string[];
    source: string;
  };
  session: MrBrownieSessionContext;
  memory: CustomerMemorySnapshot | null;
  user_profile: {
    display_name: string | null;
    favorite_product_names: string[];
    order_count: number;
    last_order_hint: string | null;
    budget_signal: string;
    sales_hooks: string[];
  } | null;
  behavior_rules: Array<{ id: string; rule: string; source: string }>;
  agent_capabilities: Record<string, unknown>;
  brain: BrainPipelineMeta;
  few_shot_training: {
    detected_intent: string;
    examples: Array<{
      intent: string;
      user: string;
      ideal_response: string;
      avoid_style?: string;
    }>;
    note: string;
  };
  /** صلاحيات التطبيق ولوحة الإدارة لهذا الدور — مرجع للردود الآمنة */
  permissions: Record<string, unknown>;
  /** أنماط رد مقترحة حسب الدور */
  response_playbook: Record<string, unknown>;
  analytics?: {
    note?: string;
    today: {
      sessions: number | null;
      orders: number;
      revenue_egp: number;
      conversion_rate: number | null;
    };
    week: {
      sessions: number | null;
      orders: number;
      revenue_egp: number;
      top_products: string[];
    };
    alerts: Array<{ type: string; severity: string; message: string }>;
  };
  orders?: {
    recent_summary: string;
    pending_count: number | null;
    abandoned_hint: string | null;
  };
};
