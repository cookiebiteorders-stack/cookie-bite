import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveLoyaltyAccountUserId } from "@/lib/loyalty/resolve-account-user-id";

export type AwardOrderPointsResult =
  | { ok: false; reason: string }
  | { ok: true; skipped: true; reason: string }
  | { ok: true; skipped: false; points: number; doubled: boolean };

/** نقطة واحدة لكل 10 جنيه، مع مضاعفة ×2 لطلبات صندوق الهدايا. */
export function computeOrderLoyaltyPoints(
  totalEgp: number,
  orderType: string | null | undefined,
): { points: number; doubled: boolean } {
  const base = Math.max(1, Math.floor(Number(totalEgp) / 10));
  const doubled = orderType === "gift_box";
  return { points: doubled ? base * 2 : base, doubled };
}

function resolveTier(totalPoints: number): "cookie_lover" | "cruncher" | "cookie_monster" {
  if (totalPoints >= 1000) return "cookie_monster";
  if (totalPoints >= 500) return "cruncher";
  return "cookie_lover";
}

/**
 * يمنح نقاط الولاء عند أول انتقال للطلب إلى paid (مرة واحدة لكل طلب).
 */
export async function awardLoyaltyPointsForPaidOrder(
  orderId: string,
): Promise<AwardOrderPointsResult> {
  const supabase = createSupabaseAdminClient();

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, user_id, guest_email, payment_status, total_egp, order_type")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return { ok: false, reason: "order_not_found" };
  }
  if (!order.user_id) {
    return { ok: true, skipped: true, reason: "guest_order" };
  }
  if ((order.payment_status ?? "").toLowerCase() !== "paid") {
    return { ok: true, skipped: true, reason: "not_paid" };
  }

  const accountUserId = await resolveLoyaltyAccountUserId(
    supabase,
    order.user_id,
    order.guest_email,
  );
  if (!accountUserId) {
    return { ok: true, skipped: true, reason: "no_public_user_profile" };
  }

  const { data: account } = await supabase
    .from("loyalty_accounts")
    .select("id, total_points, lifetime_points")
    .eq("user_id", accountUserId)
    .maybeSingle();

  let accountId = account?.id;
  if (!accountId) {
    const referral = `CB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { data: created, error: createErr } = await supabase
      .from("loyalty_accounts")
      .insert({ user_id: accountUserId, referral_code: referral })
      .select("id, total_points, lifetime_points")
      .single();
    if (createErr || !created) {
      return { ok: false, reason: "account_create_failed" };
    }
    accountId = created.id;
  }

  const { data: existingTxn } = await supabase
    .from("loyalty_transactions")
    .select("id")
    .eq("order_id", orderId)
    .eq("type", "earned")
    .maybeSingle();

  if (existingTxn) {
    return { ok: true, skipped: true, reason: "already_awarded" };
  }

  const { points, doubled } = computeOrderLoyaltyPoints(
    Number(order.total_egp ?? 0),
    order.order_type,
  );

  const prevTotal = Number(account?.total_points ?? 0);
  const prevLifetime = Number(account?.lifetime_points ?? 0);
  const nextTotal = prevTotal + points;
  const nextLifetime = prevLifetime + points;
  const tier = resolveTier(nextTotal);

  const { error: updateErr } = await supabase
    .from("loyalty_accounts")
    .update({
      total_points: nextTotal,
      lifetime_points: nextLifetime,
      tier,
    })
    .eq("id", accountId);

  if (updateErr) {
    return { ok: false, reason: "account_update_failed" };
  }

  const descEn = doubled
    ? `Earned ${points} pts (gift box ×2)`
    : `Earned ${points} pts from order`;
  const descAr = doubled
    ? `حصلت على ${points} نقطة (صندوق هدايا ×2)`
    : `حصلت على ${points} نقطة من الطلب`;

  const txnPayload: Record<string, unknown> = {
    account_id: accountId,
    type: "earned",
    points,
    description_en: descEn,
    description_ar: descAr,
    order_id: orderId,
    user_id: order.user_id,
    reason: { source: "order_paid", doubled },
  };

  const { error: txnErr } = await supabase.from("loyalty_transactions").insert(txnPayload);
  if (txnErr) {
    const legacyPayload = {
      account_id: accountId,
      type: "earned" as const,
      points,
      description_en: descEn,
      description_ar: descAr,
      order_id: orderId,
    };
    const { error: legacyErr } = await supabase
      .from("loyalty_transactions")
      .insert(legacyPayload);
    if (legacyErr) {
      console.error("loyalty transaction insert", legacyErr, txnErr);
      return { ok: false, reason: "transaction_insert_failed" };
    }
  }

  return { ok: true, skipped: false, points, doubled };
}
