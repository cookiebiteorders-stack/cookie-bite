export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum" | "vip";

export type CustomerStatus = "active" | "inactive" | "at_risk" | "vip";

export type AdminCustomerRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  points: number;
  created_at: string;
  updated_at?: string | null;
  total_orders: number;
  total_spent_egp: number;
  last_order_at: string | null;
  loyalty_tier: "bronze" | "silver" | "gold" | "platinum";
};

export type CustomerStats = {
  total_customers: number;
  new_signups_30d: number;
  returning_with_orders: number;
  vip_gold_plus: number;
  loyalty_members: number;
  at_risk_proxy: number;
  avg_ltv_sample_egp: number;
  active_last_90d: number;
};

export type CustomerSegments = {
  new_customers: number;
  returning: number;
  vip: number;
  at_risk: number;
};

export type CustomersListMeta = {
  role?: string;
  permission?: "full" | "limited" | "view" | "none";
  can_write?: boolean;
  can_delete?: boolean;
};

export type CustomersListResponse = {
  customers: AdminCustomerRow[];
  total: number;
  page: number;
  limit: number;
  stats: CustomerStats;
  segments: CustomerSegments;
  meta?: CustomersListMeta;
};

export type OrderSummaryRow = {
  id: string;
  order_code: string | null;
  total_egp: number;
  status: string;
  payment_status: string;
  created_at: string;
};

export type AddressRow = {
  id: string;
  label: string | null;
  recipient: string;
  phone: string;
  street: string;
  city: string;
  governorate: string | null;
  is_default: boolean;
};

export type CustomerDetailResponse = {
  customer: AdminCustomerRow & { clerk_user_id?: string };
  orders: OrderSummaryRow[];
  addresses: AddressRow[];
  /** ملاحظات داخلية محفوظة في customer_admin_notes */
  admin_notes?: string;
};
