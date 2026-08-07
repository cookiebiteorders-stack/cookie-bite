export type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  full_name_en: string | null;
  full_name_ar: string | null;
  phone: string | null;
  phone_secondary: string | null;
  profile_notes: string | null;
  profile_completed_at: string | null;
  avatar_url: string | null;
  role: "owner" | "admin" | "staff" | "customer";
  points: number;
  welcome_email_sent_at: string | null;
  staff_signup_alert_sent_at: string | null;
  staff_profile_alert_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  url: string;
  alt_en?: string | null;
  alt_ar?: string | null;
  order?: number;
};

export type ProductRow = {
  id: string;
  slug: string;
  /** اسم قديم (متروك للتوافق) */
  name: string;
  description: string | null;
  /** ثنائي اللغة (migration 0003) */
  title_en: string | null;
  title_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  price_egp: number;
  compare_price_egp: number | null;
  sku: string | null;
  category: string | null;
  /** صورة قديمة (متروكة) */
  image_url: string | null;
  /** صور JSONB الحديثة */
  images: ProductImage[];
  /** فيديو عرض المنتج (Cloudinary URL) */
  video_url: string | null;
  /** Canonical Cloudinary public_id for the primary image */
  cloudinary_public_id: string | null;
  badges: string[] | null;
  dietary: string[];
  seasons: string[];
  is_active: boolean;
  stock: number;
  weight_grams: number | null;
  pieces_count: number | null;
  sanity_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductMediaLink = {
  id: string;
  product_id: string;
  public_id: string;
  url: string;
  role: "primary" | "gallery" | "video";
  sort_order: number;
  alt_en: string | null;
  alt_ar: string | null;
  created_at: string;
};

export type OrderStatus =
  | "pending"
  | "processing"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "unpaid" | "paid" | "refunded" | "failed";

export type OrderRow = {
  id: string;
  /** Serial تلقائي قديم */
  order_number: number;
  /** كود طلب نصّي بصيغة CB-YYYYMMDD-NNNN (migration 0003) */
  order_code: string | null;
  user_id: string | null;
  guest_email: string | null;
  full_name?: string | null;
  phone?: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  subtotal_egp: number;
  delivery_fee_egp: number;
  discount_amount_egp: number;
  gift_wrapping_fee_egp: number;
  total_egp: number;
  promo_code: string | null;
  delivery_slot: string | null;
  delivery_slot_id?: string | null;
  scheduled_delivery_date?: string | null;
  scheduled_delivery_time?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  recipient_address?: Record<string, unknown> | null;
  hide_price?: boolean;
  anonymous_sender?: boolean;
  sender_name?: string | null;
  gift_message: string | null;
  is_gift: boolean;
  whatsapp_confirmed: boolean;
  language: "en" | "ar";
  notes: string | null;
  shipping_address: Record<string, unknown> | null;
  paymob_accept_order_id?: number | null;
  paymob_transaction_id?: string | null;
  checkout_idempotency_key?: string | null;
  order_type?: "standard" | "gift_box";
  gift_box_snapshot?: Record<string, unknown> | null;
  reveal_token?: string | null;
  reveal_viewed_at?: string | null;
  reveal_reaction?: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_snapshot: Record<string, unknown> | null;
  unit_price_egp: number;
  selected_addons: Record<string, unknown>[];
  addons_total_egp: number;
  final_total_egp: number | null;
  total_price_egp: number | null;
  quantity: number;
  created_at: string;
};

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
};
