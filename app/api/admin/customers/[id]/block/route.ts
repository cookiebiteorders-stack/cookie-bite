import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  assertCustomerModerationAllowed,
  blockCustomerEmailAccount,
  loadCustomerModerationTarget,
} from "@/lib/admin/customer-moderation";
import {
  requireAdminAccess,
  requireFullPermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { getBlockedEmail, unblockEmail } from "@/lib/db/blocked-emails";
import { bilingualError } from "@/lib/validations";

const blockSchema = z.object({
  reason: z.string().max(500).optional(),
  confirm_email: z.string().email(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminAccess("customers");
  requireFullPermission(actor);

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json(bilingualError("Invalid customer id", "معرّف العميل غير صالح"), {
      status: 400,
    });
  }

  const parsed = blockSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), { status: 400 });
  }

  const target = await loadCustomerModerationTarget(id);
  if (!target) {
    return NextResponse.json(bilingualError("Customer not found", "العميل غير موجود"), { status: 404 });
  }

  const denied = assertCustomerModerationAllowed(target, actor);
  if (denied) return denied;

  if (parsed.data.confirm_email.trim().toLowerCase() !== target.email.trim().toLowerCase()) {
    return NextResponse.json(
      bilingualError(
        "Confirmation email does not match",
        "البريد التأكيدي لا يطابق بريد العميل",
      ),
      { status: 400 },
    );
  }

  const existing = await getBlockedEmail(target.email);
  if (existing) {
    return NextResponse.json(
      bilingualError("Email is already blocked", "البريد محظور مسبقاً"),
      { status: 409 },
    );
  }

  const result = await blockCustomerEmailAccount({
    target,
    actor,
    reason: parsed.data.reason,
  });

  if (!result.ok) {
    return NextResponse.json(bilingualError(result.message.en, result.message.ar), { status: 500 });
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "customers.block_email",
    module: "customers",
    entity_id: id,
    before: { email: target.email, blocked: false },
    after: { email: target.email, blocked: true, reason: parsed.data.reason ?? null },
    metadata: { reason: parsed.data.reason ?? null },
    request: req,
  });

  return NextResponse.json({ ok: true, email_blocked: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminAccess("customers");
  requireFullPermission(actor);

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json(bilingualError("Invalid customer id", "معرّف العميل غير صالح"), {
      status: 400,
    });
  }

  const target = await loadCustomerModerationTarget(id);
  if (!target) {
    return NextResponse.json(bilingualError("Customer not found", "العميل غير موجود"), { status: 404 });
  }

  const denied = assertCustomerModerationAllowed(target, actor);
  if (denied) return denied;

  const existing = await getBlockedEmail(target.email);
  if (!existing) {
    return NextResponse.json(bilingualError("Email is not blocked", "البريد غير محظور"), {
      status: 404,
    });
  }

  const ok = await unblockEmail(target.email);
  if (!ok) {
    return NextResponse.json(bilingualError("Failed to unblock email", "تعذّر إلغاء الحظر"), {
      status: 500,
    });
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "customers.unblock_email",
    module: "customers",
    entity_id: id,
    before: { email: target.email, blocked: true },
    after: { email: target.email, blocked: false },
    metadata: {},
    request: req,
  });

  return NextResponse.json({ ok: true, email_blocked: false });
}
