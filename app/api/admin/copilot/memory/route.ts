import { NextRequest, NextResponse } from "next/server";
import { requireMrsCookieAccess } from "@/lib/admin/require-admin";
import { loadOperatorMemory, saveOperatorMemory } from "@/lib/admin/copilot/memory";
import { bilingualError } from "@/lib/validations";

export async function GET() {
  let actor;
  try {
    actor = await requireMrsCookieAccess();
  } catch (resp) {
    if (resp instanceof Response) return resp;
    throw resp;
  }

  const memory = await loadOperatorMemory(actor.clerk_user_id);
  return NextResponse.json({ ok: true, memory });
}

export async function PATCH(req: NextRequest) {
  let actor;
  try {
    actor = await requireMrsCookieAccess();
  } catch (resp) {
    if (resp instanceof Response) return resp;
    throw resp;
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), { status: 400 });
  }

  const memory = await saveOperatorMemory(actor.clerk_user_id, body as Parameters<typeof saveOperatorMemory>[1]);
  return NextResponse.json({ ok: true, memory });
}
