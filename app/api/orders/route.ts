import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserByClerkId } from "@/lib/db/users";
import { onOrderCreated } from "@/lib/email/automation/triggers";
import { recordOrderCreatedLifecycle } from "@/lib/orders/order-lifecycle";
import { scheduleOrderConfirmed } from "@/lib/notifications/schedule";
import { checkoutSchema, bilingualError } from "@/lib/validations";
import { addonsFromProductAddonJoinRows, dedupeCartSelectedAddons } from "@/lib/addons/dedupe";
import type { Addon } from "@/lib/addons/types";

type ProductForCheckout = {
  id: string;
  slug: string;
  name: string;
  title_en: string | null;
  title_ar: string | null;
  price_egp: number;
  stock: number;
  image_url: string | null;
  images: unknown;
};

const FREE_DELIVERY_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_FREE_DELIVERY_THRESHOLD_EGP ?? 500,
);
const DELIVERY_FEE = 50;
const GIFT_WRAP_FEE = 30;

// ---------------------------------------------------------------------------
// POST — إنشاء طلب جديد (Checkout)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      bilingualError("Invalid JSON", "صيغة غير صالحة"),
      { status: 400 },
    );
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ...bilingualError("Validation failed", "فشل التحقق"),
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const headerIdem = req.headers.get("idempotency-key")?.trim();
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const idempotencyKey =
    data.idempotency_key ?? (headerIdem && uuidRe.test(headerIdem) ? headerIdem : null);

  const supabase = createSupabaseAdminClient();

  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("orders")
      .select(
        "id, order_code, order_number, subtotal_egp, discount_amount_egp, delivery_fee_egp, gift_wrapping_fee_egp, total_egp, payment_method",
      )
      .eq("checkout_idempotency_key", idempotencyKey)
      .maybeSingle<{
        id: string;
        order_code: string | null;
        order_number: number;
        subtotal_egp: number;
        discount_amount_egp: number;
        delivery_fee_egp: number;
        gift_wrapping_fee_egp: number;
        total_egp: number;
        payment_method: string | null;
      }>();
    if (existing) {
      return NextResponse.json({
        ok: true,
        idempotent_replay: true,
        order_id: existing.id,
        order_code: existing.order_code ?? `#${existing.order_number}`,
        order_number: existing.order_number,
        subtotal_egp: Number(existing.subtotal_egp),
        discount_amount_egp: Number(existing.discount_amount_egp),
        delivery_fee_egp: Number(existing.delivery_fee_egp),
        gift_wrapping_fee_egp: Number(existing.gift_wrapping_fee_egp),
        total_egp: Number(existing.total_egp),
        payment_method: existing.payment_method,
      });
    }
  }

  // 1) المنتجات والمخزون — supabase already created above
  const productIds = data.cart_items.map((i) => i.product_id);
  const { data: rawProducts, error: pErr } = await supabase
    .from("products")
    .select(
      "id, slug, name, title_en, title_ar, price_egp, stock, image_url, images",
    )
    .in("id", productIds)
    .eq("is_active", true);

  if (pErr) {
    console.error("orders products lookup", pErr);
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }
  const products = (rawProducts ?? []) as ProductForCheckout[];

  for (const item of data.cart_items) {
    const product = products.find((p) => p.id === item.product_id);
    if (!product) {
      return NextResponse.json(
        bilingualError(
          `Product not found: ${item.product_id}`,
          "المنتج غير موجود",
        ),
        { status: 400 },
      );
    }
    if (product.stock < item.quantity) {
      return NextResponse.json(
        {
          error: {
            en: `${product.title_en ?? product.name} is out of stock`,
            ar: `${product.title_ar ?? product.name} غير متاح`,
          },
        },
        { status: 400 },
      );
    }
  }

  // 2) المجاميع
  let subtotal = 0;
  const orderLines = data.cart_items.map((item) => {
    const product = products.find((p) => p.id === item.product_id)!;
    const unit_price = Number(product.price_egp);
    const addons_total_unit = (item.addons ?? []).reduce(
      (sum, addon) =>
        sum +
        addon.options.reduce(
          (inner, opt) => inner + Number(opt.price_snapshot) * opt.quantity,
          0,
        ),
      0,
    );
    const final_unit_price = unit_price + addons_total_unit;
    const total_price = final_unit_price * item.quantity;
    subtotal += total_price;
    return {
      product_id: product.id,
      product_snapshot: product,
      quantity: item.quantity,
      unit_price_egp: unit_price,
      addons_total_egp: addons_total_unit * item.quantity,
      final_total_egp: total_price,
      total_price_egp: total_price,
      product_name: product.title_en ?? product.name,
    };
  });

  for (const item of data.cart_items) {
    const itemAddons = dedupeCartSelectedAddons(item.addons ?? []);
    if (itemAddons.length === 0) continue;
    item.addons = itemAddons;
    const product = products.find((p) => p.id === item.product_id)!;
    const { data: links } = await supabase
      .from("product_addons")
      .select("addons(*)")
      .eq("product_id", product.id)
      .returns<Array<{ addons?: Addon | Addon[] | null }>>();
    const linkedAddons = addonsFromProductAddonJoinRows(links ?? []);
    const linkedMap = new Map(linkedAddons.map((a) => [a.id, a]));
    for (const addonSel of item.addons) {
      const linked = linkedMap.get(addonSel.addon_id);
      if (!linked) {
        return NextResponse.json(bilingualError("Invalid add-on", "إضافة غير صالحة"), { status: 400 });
      }
      for (const optSel of addonSel.options) {
        const option = linked.options.find((o) => o.id === optSel.option_id);
        if (!option) {
          return NextResponse.json(bilingualError("Invalid add-on option", "خيار إضافة غير صالح"), { status: 400 });
        }
        if (option.quantity_limit != null && optSel.quantity > option.quantity_limit) {
          return NextResponse.json(
            bilingualError("Add-on quantity limit exceeded", "تجاوزت حد كمية الإضافة"),
            { status: 400 },
          );
        }
      }
    }
    for (const linked of linkedAddons) {
      if (!linked.required) continue;
      const selectedAddon = item.addons.find((a) => a.addon_id === linked.id);
      if (!selectedAddon || selectedAddon.options.length === 0) {
        return NextResponse.json(
          bilingualError("Missing required add-on", "إضافة مطلوبة غير محددة"),
          { status: 400 },
        );
      }
    }
  }

  const cartProductIds = orderLines.map((l) => l.product_id);

  // 4) العنوان
  let shipping_address: Record<string, unknown> | null = null;
  if (data.address_id) {
    const { data: addr } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", data.address_id)
      .maybeSingle();
    if (addr) shipping_address = addr;
  }
  shipping_address = shipping_address ?? data.address ?? null;
  if (!shipping_address) {
    return NextResponse.json(
      bilingualError("Missing address", "العنوان مفقود"),
      { status: 400 },
    );
  }

  // 5) المستخدم
  const { userId } = await auth();
  let user_id: string | null = null;
  let user_email: string | null = null;
  let user_name: string | null = null;
  if (userId) {
    const profile = await getUserByClerkId(userId);
    user_id = profile?.id ?? null;
    user_email = profile?.email ?? null;
    user_name = profile?.full_name ?? null;
  }

  // 5b) Promo (after user_id for first-order / VIP rules)
  let discount_amount = 0;
  let promoIdToIncrement: string | null = null;
  let promoFreeShipping = false;

  if (data.promo_code) {
    const { applyPromoAtCheckout } = await import("@/lib/promo/apply-promo-checkout");
    const promoResult = await applyPromoAtCheckout({
      supabase,
      code: data.promo_code,
      cartSubtotal: subtotal,
      cartProductIds,
      userId: user_id,
    });
    if (!promoResult.ok) {
      return NextResponse.json(
        bilingualError(promoResult.error_en, promoResult.error_ar),
        { status: 400 },
      );
    }
    discount_amount = promoResult.discount_amount;
    promoIdToIncrement = promoResult.promo.id;
    promoFreeShipping = promoResult.free_shipping;
  }

  let delivery_fee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  if (promoFreeShipping) delivery_fee = 0;
  const gift_wrapping_fee = data.is_gift ? GIFT_WRAP_FEE : 0;
  const total = Math.max(
    0,
    subtotal - discount_amount + delivery_fee + gift_wrapping_fee,
  );

  // 6) إنشاء الطلب
  const status = data.payment_method === "cod" ? "processing" : "pending";
  const payment_status = "unpaid";

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .insert({
      user_id,
      guest_email: userId ? null : data.guest_email ?? null,
      status,
      payment_status,
      payment_method: data.payment_method,
      subtotal_egp: subtotal,
      delivery_fee_egp: delivery_fee,
      discount_amount_egp: discount_amount,
      gift_wrapping_fee_egp: gift_wrapping_fee,
      total_egp: total,
      promo_code: promoIdToIncrement ? data.promo_code?.toUpperCase() : null,
      delivery_slot: data.delivery_slot ?? null,
      gift_message: data.gift_message ?? null,
      is_gift: data.is_gift,
      language: data.language,
      shipping_address,
      checkout_idempotency_key: idempotencyKey,
    })
    .select("id, order_code, order_number, total_egp")
    .single();

  if (oErr || !order) {
    const code = (oErr as { code?: string } | null)?.code;
    if (idempotencyKey && code === "23505") {
      const { data: existing } = await supabase
        .from("orders")
        .select(
          "id, order_code, order_number, subtotal_egp, discount_amount_egp, delivery_fee_egp, gift_wrapping_fee_egp, total_egp, payment_method",
        )
        .eq("checkout_idempotency_key", idempotencyKey)
        .maybeSingle<{
          id: string;
          order_code: string | null;
          order_number: number;
          subtotal_egp: number;
          discount_amount_egp: number;
          delivery_fee_egp: number;
          gift_wrapping_fee_egp: number;
          total_egp: number;
          payment_method: string | null;
        }>();
      if (existing) {
        return NextResponse.json({
          ok: true,
          idempotent_replay: true,
          order_id: existing.id,
          order_code: existing.order_code ?? `#${existing.order_number}`,
          order_number: existing.order_number,
          subtotal_egp: Number(existing.subtotal_egp),
          discount_amount_egp: Number(existing.discount_amount_egp),
          delivery_fee_egp: Number(existing.delivery_fee_egp),
          gift_wrapping_fee_egp: Number(existing.gift_wrapping_fee_egp),
          total_egp: Number(existing.total_egp),
          payment_method: existing.payment_method,
        });
      }
    }
    console.error("orders insert error", oErr);
    return NextResponse.json(
      bilingualError("Failed to create order", "فشل إنشاء الطلب"),
      { status: 500 },
    );
  }

  // 7) عناصر الطلب
  const itemsForInsert = orderLines.map((l) => ({
    order_id: order.id,
    product_id: l.product_id,
    product_name: l.product_name,
    product_snapshot: l.product_snapshot,
    unit_price_egp: l.unit_price_egp,
    total_price_egp: l.total_price_egp,
    selected_addons:
      data.cart_items.find((ci) => ci.product_id === l.product_id)?.addons ?? [],
    addons_total_egp: l.addons_total_egp,
    final_total_egp: l.final_total_egp,
    quantity: l.quantity,
  }));

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(itemsForInsert);

  if (itemsErr) {
    console.error("order_items insert error", itemsErr);
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json(
      bilingualError("Failed to save items", "فشل حفظ العناصر"),
      { status: 500 },
    );
  }

  const { data: fullOrder } = await supabase.from("orders").select("*").eq("id", order.id).maybeSingle();
  void recordOrderCreatedLifecycle(
    supabase,
    (fullOrder ?? order) as Record<string, unknown>,
    itemsForInsert as Record<string, unknown>[],
    {
      user_id: user_id ?? null,
      email: user_email ?? data.guest_email ?? null,
      role: user_id ? "customer" : "guest",
    },
  );

  // 8) خصم المخزون
  for (const item of data.cart_items) {
    const { error: stockErr } = await supabase.rpc(
      "decrement_product_stock",
      { p_id: item.product_id, qty: item.quantity },
    );
    if (stockErr) {
      console.error("stock decrement failed (non-fatal)", stockErr);
    }
  }

  // 9) إحصاء استخدام promo
  if (promoIdToIncrement) {
    await supabase.from("promo_code_uses").insert({
      promo_code_id: promoIdToIncrement,
      user_id,
      order_id: order.id,
    });
    await supabase
      .from("promo_codes")
      .update({ used_count: (await getPromoUsedCount(supabase, promoIdToIncrement)) + 1 })
      .eq("id", promoIdToIncrement);
  }

  scheduleOrderConfirmed(order.id);

  const recipientEmail = user_email ?? data.guest_email ?? null;
  if (recipientEmail) {
    const orderItemsText = data.cart_items
      .map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        const label = product?.title_en ?? product?.name ?? item.product_id;
        return `${label} x${item.quantity}`;
      })
      .join(", ");

    try {
      await onOrderCreated({
        email: recipientEmail,
        userId: user_id,
        userName: user_name ?? undefined,
        orderId: order.order_code ?? String(order.order_number),
        orderItems: orderItemsText,
        totalPrice: total.toFixed(2),
      });
    } catch (eventError) {
      console.error("order_created email trigger failed", eventError);
    }
  }

  return NextResponse.json({
    ok: true,
    order_id: order.id,
    order_code: order.order_code ?? `#${order.order_number}`,
    order_number: order.order_number,
    subtotal_egp: subtotal,
    discount_amount_egp: discount_amount,
    delivery_fee_egp: delivery_fee,
    gift_wrapping_fee_egp: gift_wrapping_fee,
    total_egp: total,
    payment_method: data.payment_method,
  });
}

async function getPromoUsedCount(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  id: string,
): Promise<number> {
  const { data } = await supabase
    .from("promo_codes")
    .select("used_count")
    .eq("id", id)
    .maybeSingle<{ used_count: number }>();
  return data?.used_count ?? 0;
}

// ---------------------------------------------------------------------------
// GET — قائمة طلبات المستخدم الحالي
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      bilingualError("Unauthorized", "غير مصرح"),
      { status: 401 },
    );
  }

  const profile = await getUserByClerkId(userId);
  if (!profile) {
    return NextResponse.json(
      bilingualError("Profile not found", "الملف غير موجود"),
      { status: 404 },
    );
  }

  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? 20),
    50,
  );

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_code, order_number, status, payment_status, payment_method, subtotal_egp, delivery_fee_egp, discount_amount_egp, total_egp, language, created_at",
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("/api/orders GET error", error);
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  return NextResponse.json({ orders: data ?? [] });
}

export const dynamic = "force-dynamic";
