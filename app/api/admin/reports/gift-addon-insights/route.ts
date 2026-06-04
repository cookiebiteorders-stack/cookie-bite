import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { parseGiftBoxSnapshot } from "@/lib/gift-box/order-snapshot";
import { bilingualError } from "@/lib/validations";

const querySchema = z.object({
  days: z.coerce.number().int().min(7).max(180).optional().default(30),
});

type AddonAgg = { name: string; count: number; revenue: number };
type BoxSizeAgg = { size: string; orders: number; revenue: number };

export async function GET(req: NextRequest) {
  await requireAdminAccess("analytics");
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid query", "استعلام غير صالح"),
      { status: 400 },
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - parsed.data.days);
  const sinceIso = since.toISOString();

  const supabase = createSupabaseAdminClient();

  const { data: giftOrders, error: giftErr } = await supabase
    .from("orders")
    .select("id, total_egp, gift_box_snapshot, created_at")
    .eq("order_type", "gift_box")
    .eq("payment_status", "paid")
    .gte("created_at", sinceIso);

  if (giftErr) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  const boxSizes = new Map<string, BoxSizeAgg>();
  let giftBoxRevenue = 0;
  let giftBoxCount = 0;

  for (const row of giftOrders ?? []) {
    giftBoxCount += 1;
    giftBoxRevenue += Number(row.total_egp ?? 0);
    const snap = parseGiftBoxSnapshot(row.gift_box_snapshot);
    const size = snap?.boxSize ?? "unknown";
    const prev = boxSizes.get(size) ?? { size, orders: 0, revenue: 0 };
    prev.orders += 1;
    prev.revenue += Number(row.total_egp ?? 0);
    boxSizes.set(size, prev);
  }

  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("selected_addons, addons_total_egp, quantity, created_at, order_id")
    .gte("created_at", sinceIso);

  if (itemsErr) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  const addonMap = new Map<string, AddonAgg>();

  for (const row of items ?? []) {
    const addons = Array.isArray(row.selected_addons) ? row.selected_addons : [];
    for (const raw of addons) {
      const a = raw as Record<string, unknown>;
      const name =
        (typeof a.name === "string" && a.name) ||
        (typeof a.name_ar === "string" && a.name_ar) ||
        (typeof a.name_en === "string" && a.name_en) ||
        (typeof a.addon_name === "string" && a.addon_name) ||
        "addon";
      const qty = Number(a.quantity ?? row.quantity ?? 1);
      const price = Number(a.price ?? a.price_egp ?? 0);
      const prev = addonMap.get(name) ?? { name, count: 0, revenue: 0 };
      prev.count += qty;
      prev.revenue += price * qty;
      addonMap.set(name, prev);
    }
    if (Number(row.addons_total_egp) > 0 && addons.length === 0) {
      const prev = addonMap.get("(unspecified)") ?? {
        name: "(unspecified)",
        count: 0,
        revenue: 0,
      };
      prev.count += Number(row.quantity ?? 1);
      prev.revenue += Number(row.addons_total_egp);
      addonMap.set("(unspecified)", prev);
    }
  }

  const topAddons = [...addonMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
  const topBoxSizes = [...boxSizes.values()].sort((a, b) => b.orders - a.orders);

  return NextResponse.json({
    period_days: parsed.data.days,
    gift_boxes: {
      count: giftBoxCount,
      revenue_egp: Math.round(giftBoxRevenue),
      by_size: topBoxSizes,
    },
    addons: { top: topAddons },
  });
}
