import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function resolveTier(totalPoints: number): "cookie_lover" | "cruncher" | "cookie_monster" {
  if (totalPoints >= 1000) return "cookie_monster";
  if (totalPoints >= 500) return "cruncher";
  return "cookie_lover";
}

/** يعكس نقاط «earned» المرتبطة بالطلب قبل حذفه. */
export async function reverseLoyaltyPointsForOrder(
  orderId: string,
): Promise<{ reversedPoints: number; transactionCount: number }> {
  const supabase = createSupabaseAdminClient();

  const { data: txns, error: txnErr } = await supabase
    .from("loyalty_transactions")
    .select("id, account_id, type, points")
    .eq("order_id", orderId)
    .eq("type", "earned");

  if (txnErr || !txns?.length) {
    return { reversedPoints: 0, transactionCount: 0 };
  }

  const byAccount = new Map<string, number>();
  for (const t of txns) {
    const prev = byAccount.get(t.account_id) ?? 0;
    byAccount.set(t.account_id, prev + Number(t.points));
  }

  let reversedPoints = 0;
  for (const [accountId, pointsToRemove] of byAccount) {
    const { data: acc } = await supabase
      .from("loyalty_accounts")
      .select("id, total_points, lifetime_points")
      .eq("id", accountId)
      .maybeSingle();
    if (!acc) continue;

    const nextTotal = Math.max(0, Number(acc.total_points) - pointsToRemove);
    const nextLifetime = Math.max(0, Number(acc.lifetime_points) - pointsToRemove);
    reversedPoints += pointsToRemove;

    await supabase
      .from("loyalty_accounts")
      .update({
        total_points: nextTotal,
        lifetime_points: nextLifetime,
        tier: resolveTier(nextTotal),
      })
      .eq("id", accountId);
  }

  await supabase.from("loyalty_transactions").delete().eq("order_id", orderId);

  return { reversedPoints, transactionCount: txns.length };
}
