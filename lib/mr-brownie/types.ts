import type { UserRole } from "@/lib/admin/rbac";

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
  products: Array<{
    id: string;
    name: string;
    description: string;
    price_egp: number;
    category: string;
  }>;
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
  offers: Array<{
    code: string;
    discount_summary: string;
    expiry: string | null;
    eligible_products: string[];
  }>;
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
