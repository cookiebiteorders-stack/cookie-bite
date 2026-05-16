import { NextRequest, NextResponse } from "next/server";
import { verifyInternalSecret } from "@/lib/auth/verify-internal";
import { dispatchOrderConfirmed } from "@/lib/notifications/orchestrator";
import { bilingualError } from "@/lib/validations";

export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json(bilingualError("Forbidden", "ممنوع"), {
      status: 403,
    });
  }

  const body = (await req.json().catch(() => null)) as { order_id?: string } | null;
  if (!body?.order_id) {
    return NextResponse.json(
      bilingualError("Missing order_id", "معرّف الطلب مفقود"),
      { status: 400 },
    );
  }

  const result = await dispatchOrderConfirmed(body.order_id, { force: true });
  if (!result.ok && result.errors.includes("order_not_found")) {
    return NextResponse.json(
      bilingualError("Order not found", "الطلب غير موجود"),
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: result.ok, errors: result.errors });
}
