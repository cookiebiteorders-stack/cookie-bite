import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import {
  getResendContact,
  isResendContactsAvailable,
  removeResendContact,
  updateResendContact,
} from "@/lib/email/resend-contacts";
import { isResendContactsManagementEnabled, resendApiErrorPayload } from "@/lib/email/resend-errors";
import { bilingualError } from "@/lib/validations";

type Params = { params: Promise<{ ref: string }> };

function parseRef(ref: string): { id?: string; email?: string } {
  const decoded = decodeURIComponent(ref);
  if (decoded.includes("@")) return { email: decoded };
  return { id: decoded };
}

const updateSchema = z.object({
  firstName: z.string().max(80).nullable().optional(),
  lastName: z.string().max(80).nullable().optional(),
  unsubscribed: z.boolean().optional(),
});

export async function GET(_req: NextRequest, ctx: Params) {
  await requireAdminAccess("settings");
  if (!isResendContactsAvailable()) {
    return NextResponse.json(
      bilingualError("Resend not configured", "Resend غير مضبوط"),
      { status: 503 },
    );
  }

  const { ref } = await ctx.params;
  try {
    const contact = await getResendContact(parseRef(ref));
    return NextResponse.json({ ok: true, contact });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "not_found";
    return NextResponse.json(resendApiErrorPayload(msg), { status: 404 });
  }
}

export async function PATCH(req: NextRequest, ctx: Params) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);

  if (!isResendContactsManagementEnabled()) {
    return NextResponse.json(resendApiErrorPayload("Contact management disabled"), {
      status: 400,
    });
  }
  if (!isResendContactsAvailable()) {
    return NextResponse.json(
      bilingualError("Resend not configured", "Resend غير مضبوط"),
      { status: 503 },
    );
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), { status: 400 });
  }

  const { ref } = await ctx.params;
  try {
    const contact = await updateResendContact({ ...parseRef(ref), ...parsed.data });
    return NextResponse.json({ ok: true, contact });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "update_failed";
    return NextResponse.json(resendApiErrorPayload(msg), { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Params) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);

  if (!isResendContactsManagementEnabled()) {
    return NextResponse.json(resendApiErrorPayload("Contact management disabled"), {
      status: 400,
    });
  }
  if (!isResendContactsAvailable()) {
    return NextResponse.json(
      bilingualError("Resend not configured", "Resend غير مضبوط"),
      { status: 503 },
    );
  }

  const { ref } = await ctx.params;
  try {
    const result = await removeResendContact(parseRef(ref));
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "delete_failed";
    return NextResponse.json(resendApiErrorPayload(msg), { status: 400 });
  }
}
