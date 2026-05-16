import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { listNotificationLogsForOrder } from "@/lib/notifications/log";
import {
  dispatchOrderConfirmed,
  dispatchPaymentConfirmed,
} from "@/lib/notifications/orchestrator";
import { bilingualError } from "@/lib/validations";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  await requireAdminAccess("orders");
  const { id } = await ctx.params;
  const logs = await listNotificationLogsForOrder(id);
  return NextResponse.json({ ok: true, logs });
}

const ResendSchema = z.object({
  type: z.enum(["order_confirmation", "payment_confirmation"]),
});

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const actor = await requireAdminAccess("orders");
  requireWritePermission(actor);
  const { id } = await ctx.params;

  const parsed = ResendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), {
      status: 400,
    });
  }

  const result =
    parsed.data.type === "order_confirmation"
      ? await dispatchOrderConfirmed(id, { force: true })
      : await dispatchPaymentConfirmed(id, { force: true });

  return NextResponse.json({
    ok: result.ok,
    type: parsed.data.type,
    errors: result.errors,
    invoiceNumber:
      "invoiceNumber" in result ? (result as { invoiceNumber?: string }).invoiceNumber : undefined,
  });
}
