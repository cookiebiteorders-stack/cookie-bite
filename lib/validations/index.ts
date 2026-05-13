import { z } from "zod";

/**
 * Cookie Bite — Zod مركزي لكل المسارات.
 * كل رسائل الخطأ ثنائية اللغة عبر helper bilingualError().
 */

export const bilingualError = (en: string, ar: string) => ({
  error: { en, ar },
});

export const egyptianPhone = z
  .string()
  .regex(/^(\+?20)?01[0-2,5]\d{8}$/, {
    message: "Invalid Egyptian phone number",
  });

export const languageEnum = z.enum(["en", "ar"]);

export const governorateEnum = z.enum([
  "Cairo",
  "Giza",
  "Alexandria",
  "Other",
]);

// ---------------------------------------------------------------------------
// Address
// ---------------------------------------------------------------------------
export const addressSchema = z.object({
  label: z.string().max(40).optional(),
  full_name: z.string().min(2).max(100),
  phone: egyptianPhone,
  governorate: governorateEnum,
  area: z.string().min(2).max(100),
  street: z.string().min(2).max(200),
  building: z.string().min(1).max(50),
  apartment: z.string().max(50).optional(),
  landmark: z.string().max(120).optional(),
  is_default: z.boolean().optional().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

// ---------------------------------------------------------------------------
// Cart line (مرسلة من العميل — لا نثق بالأسعار، نعيد حسابها على السيرفر)
// ---------------------------------------------------------------------------
export const cartItemSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});
export type CartItemInput = z.infer<typeof cartItemSchema>;

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------
export const paymentMethodEnum = z.enum([
  "card",
  "wallet",
  "instapay",
  "fawry",
  "cod",
]);

export const checkoutSchema = z
  .object({
    address_id: z.string().uuid().optional(),
    address: addressSchema.optional(),
    delivery_slot: z.string().max(60).optional(),
    payment_method: paymentMethodEnum,
    promo_code: z.string().min(3).max(20).optional(),
    gift_message: z.string().max(500).optional(),
    is_gift: z.boolean().default(false),
    send_whatsapp_confirmation: z.boolean().default(true),
    language: languageEnum.default("ar"),
    guest_email: z.string().email().optional(),
    cart_items: z.array(cartItemSchema).min(1),
    /** يُقبل أيضاً من رأس HTTP `Idempotency-Key` في المسار */
    idempotency_key: z.string().uuid().optional(),
  })
  .refine((d) => Boolean(d.address_id || d.address), {
    message: "Either address_id or address must be provided",
    path: ["address"],
  });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ---------------------------------------------------------------------------
// Promo
// ---------------------------------------------------------------------------
export const promoCodeSchema = z.object({
  code: z.string().min(3).max(20),
  cart_total: z.number().positive(),
});
export type PromoCodeInput = z.infer<typeof promoCodeSchema>;

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export const reviewSchema = z.object({
  product_id: z.string().uuid(),
  order_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(10).max(1000).optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

// ---------------------------------------------------------------------------
// Push subscriptions
// ---------------------------------------------------------------------------
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  platform: z.enum(["android", "ios", "desktop"]).optional(),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

// ---------------------------------------------------------------------------
// Gift box
// ---------------------------------------------------------------------------
export const giftBoxSchema = z.object({
  box_size: z.union([z.literal(6), z.literal(12), z.literal(24)]),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
  gift_message: z.string().max(500).optional(),
  ribbon_color: z.string().max(20).optional().default("caramel"),
  has_wrapping: z.boolean().default(true),
});
export type GiftBoxInput = z.infer<typeof giftBoxSchema>;

// ---------------------------------------------------------------------------
// Products list query
// ---------------------------------------------------------------------------
export const productsQuerySchema = z.object({
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
  sort: z
    .enum(["newest", "price_asc", "price_desc", "popular"])
    .default("newest"),
  season: z.string().optional(),
  min_price: z.coerce.number().nonnegative().optional(),
  max_price: z.coerce.number().positive().optional(),
});
export type ProductsQuery = z.infer<typeof productsQuerySchema>;
