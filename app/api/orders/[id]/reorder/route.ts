import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserByClerkId } from "@/lib/db/users";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkGiftBoxSnapshotAvailability } from "@/lib/gift-box/check-availability";
import { parseGiftBoxSnapshot } from "@/lib/gift-box/order-snapshot";
import { bilingualError } from "@/lib/validations";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }

  const profile = await getUserByClerkId(clerkUserId);
  if (!profile?.id) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }

  const rawParams = await ctx.params;
  const parsedParams = paramsSchema.safeParse(rawParams);
  if (!parsedParams.success) {
    return NextResponse.json(bilingualError("Invalid order id", "معرّف الطلب غير صالح"), {
      status: 400,
    });
  }

  const supabase = createSupabaseAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, user_id, order_type, gift_box_snapshot")
    .eq("id", parsedParams.data.id)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json(bilingualError("Order not found", "الطلب غير موجود"), {
      status: 404,
    });
  }

  if (order.user_id !== profile.id) {
    return NextResponse.json(bilingualError("Forbidden", "ممنوع"), { status: 403 });
  }

  const snapshot = parseGiftBoxSnapshot(order.gift_box_snapshot);
  if (order.order_type !== "gift_box" || !snapshot) {
    return NextResponse.json(
      bilingualError("This order is not a gift box", "هذا الطلب ليس صندوق هدايا"),
      { status: 400 },
    );
  }

  const availability = await checkGiftBoxSnapshotAvailability(snapshot);

  return NextResponse.json({
    ok: true,
    snapshot,
    unavailableItems: availability.unavailableItems,
    canReorder: availability.canReorder,
  });
}
