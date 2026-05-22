import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import {
  createResendContact,
  isResendContactsAvailable,
  listResendContacts,
} from "@/lib/email/resend-contacts";
import { bilingualError } from "@/lib/validations";

const createSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  unsubscribed: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  await requireAdminAccess("settings");
  if (!isResendContactsAvailable()) {
    return NextResponse.json(
      bilingualError("Resend not configured", "Resend غير مضبوط"),
      { status: 503 },
    );
  }

  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50);
  const after = req.nextUrl.searchParams.get("after") ?? undefined;

  try {
    const { contacts, hasMore } = await listResendContacts({ limit, after });
    return NextResponse.json({ ok: true, contacts, hasMore });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "list_failed";
    return NextResponse.json(bilingualError(msg, msg), { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);

  if (!isResendContactsAvailable()) {
    return NextResponse.json(
      bilingualError("Resend not configured", "Resend غير مضبوط"),
      { status: 503 },
    );
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), { status: 400 });
  }

  try {
    const contact = await createResendContact(parsed.data);
    return NextResponse.json({ ok: true, contact });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "create_failed";
    return NextResponse.json(bilingualError(msg, msg), { status: 400 });
  }
}
