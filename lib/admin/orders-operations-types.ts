export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

export type AdminOrderRow = {
  id: string;
  order_code: string | null;
  order_number?: number | null;
  guest_email: string | null;
  user_id?: string | null;
  total_egp: number;
  subtotal_egp?: number | null;
  delivery_fee_egp?: number | null;
  discount_amount_egp?: number | null;
  payment_method?: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  shipping_address?: Record<string, unknown> | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  promo_code?: string | null;
  paymob_transaction_id?: string | null;
  /** من استعلام order_items(count) */
  items_count?: number;
  order_items?: { count?: number }[] | null;
};

export type OrderStats = {
  pending: number;
  processing: number;
  packed: number;
  shipped: number;
  delivered: number;
  returned: number;
  cancelled: number;
  failed_payments: number;
  revenue_today_egp: number;
  orders_today: number;
  orders_yesterday: number;
};

export type OrdersListMeta = {
  role?: string;
  permission?: "full" | "limited" | "view" | "none";
  can_write?: boolean;
  can_delete?: boolean;
};

export type OrdersListResponse = {
  orders: AdminOrderRow[];
  total: number;
  page: number;
  limit: number;
  stats: OrderStats;
  meta?: OrdersListMeta;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price_egp: number;
  quantity: number;
  product_snapshot?: Record<string, unknown> | null;
  total_price_egp?: number | null;
  created_at?: string | null;
};

export type OrderDetailResponse = {
  order: AdminOrderRow;
  items: OrderItemRow[];
};
