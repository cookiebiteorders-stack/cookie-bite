import {
  sendAccountBlockedNotification,
  sendAccountDeletedNotification,
} from "@/lib/admin/customer-moderation-email";
import { blockEmail } from "@/lib/db/blocked-emails";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminActor } from "@/lib/admin/require-admin";

export type CustomerModerationTarget = {
  id: string;
  email: string;
  supabase_user_id: string;
  role: string;
  full_name?: string | null;
};

export function isManualCrmSupabaseId(supabaseUserId: string): boolean {
  return supabaseUserId.startsWith("crm-manual:");
}

export async function loadCustomerModerationTarget(
  userId: string,
): Promise<CustomerModerationTarget | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,supabase_user_id:id,role,full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as CustomerModerationTarget;
}

export function assertCustomerModerationAllowed(
  target: CustomerModerationTarget,
  actor: AdminActor,
): Response | null {
  if (target.role !== "customer") {
    return new Response(
      JSON.stringify({
        error: {
          en: "Only customer accounts can be moderated",
          ar: "يمكن إدارة حسابات العملاء فقط",
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  if (actor.user_id && actor.user_id === target.id) {
    return new Response(
      JSON.stringify({
        error: {
          en: "You cannot moderate your own account",
          ar: "لا يمكنك تنفيذ هذا الإجراء على حسابك",
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  return null;
}

function supabaseErrorLooksBenign(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /not found|already|banned|deleted/i.test(msg);
}

async function disableSupabaseUser(supabaseUserId: string): Promise<void> {
  if (isManualCrmSupabaseId(supabaseUserId)) return;
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.auth.admin.updateUserById(supabaseUserId, { ban_duration: '876000h' }); // Ban for 100 years
  } catch (err) {
    if (supabaseErrorLooksBenign(err)) return;
    console.error("disableSupabaseUser failed", supabaseUserId, err);
    throw err;
  }
}

async function deleteSupabaseUser(supabaseUserId: string): Promise<void> {
  if (isManualCrmSupabaseId(supabaseUserId)) return;
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.auth.admin.deleteUser(supabaseUserId);
  } catch (err) {
    if (supabaseErrorLooksBenign(err)) return;
    console.error("deleteSupabaseUser failed", supabaseUserId, err);
    throw err;
  }
}

export async function blockCustomerEmailAccount(input: {
  target: CustomerModerationTarget;
  actor: AdminActor;
  reason?: string | null;
}): Promise<{ ok: true } | { ok: false; message: { en: string; ar: string } }> {
  const blocked = await blockEmail({
    email: input.target.email,
    reason: input.reason,
    blockedByUserId: input.actor.user_id,
    blockedByEmail: input.actor.email,
    customerUserId: input.target.id,
  });
  if (!blocked) {
    return {
      ok: false,
      message: { en: "Failed to block email", ar: "تعذّر حظر البريد" },
    };
  }

  try {
    await disableSupabaseUser(input.target.supabase_user_id);
  } catch {
    return {
      ok: false,
      message: {
        en: "Email blocked locally but Supabase ban failed",
        ar: "تم حظر البريد محلياً لكن فشل الحظر في Supabase",
      },
    };
  }

  return { ok: true };
}

/** Remove customer profile only — does not block the email for re-registration. */
export async function deleteCustomerAccount(input: {
  target: CustomerModerationTarget;
}): Promise<{ ok: true } | { ok: false; message: { en: string; ar: string } }> {
  try {
    await sendAccountDeletedNotification({
      email: input.target.email,
      fullName: input.target.full_name,
    });
  } catch (err) {
    console.error("[deleteCustomerAccount] notification email failed", err);
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("profiles").delete().eq("id", input.target.id);
  if (error) {
    console.error("deleteCustomerAccount db error", error);
    return {
      ok: false,
      message: { en: "Failed to delete customer", ar: "تعذّر حذف العميل" },
    };
  }

  try {
    await deleteSupabaseUser(input.target.supabase_user_id);
  } catch {
    return {
      ok: false,
      message: {
        en: "Customer removed from database but Supabase delete failed",
        ar: "تم حذف العميل من قاعدة البيانات لكن فشل الحذف من Supabase",
      },
    };
  }

  return { ok: true };
}

/** Block email, remove Supabase access, and delete the CRM profile. */
export async function blockAndDeleteCustomerAccount(input: {
  target: CustomerModerationTarget;
  actor: AdminActor;
  reason?: string | null;
}): Promise<{ ok: true } | { ok: false; message: { en: string; ar: string } }> {
  try {
    await sendAccountBlockedNotification({
      email: input.target.email,
      fullName: input.target.full_name,
      reason: input.reason,
    });
  } catch (err) {
    console.error("[blockAndDeleteCustomerAccount] notification email failed", err);
  }

  const blocked = await blockEmail({
    email: input.target.email,
    reason: input.reason?.trim() || "Blocked by admin",
    blockedByUserId: input.actor.user_id,
    blockedByEmail: input.actor.email,
    customerUserId: input.target.id,
  });
  if (!blocked) {
    return {
      ok: false,
      message: {
        en: "Failed to block email — is migration 0059 applied?",
        ar: "تعذّر حظر البريد — تأكد من تطبيق migration 0059 على Supabase",
      },
    };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("profiles").delete().eq("id", input.target.id);
  if (error) {
    console.error("blockAndDeleteCustomerAccount db error", error);
    return {
      ok: false,
      message: {
        en: "Email blocked but failed to delete customer profile",
        ar: "تم حظر البريد لكن تعذّر حذف ملف العميل",
      },
    };
  }

  try {
    await deleteSupabaseUser(input.target.supabase_user_id);
  } catch {
    return {
      ok: false,
      message: {
        en: "Email blocked and profile removed, but Supabase delete failed",
        ar: "تم الحظر وحذف الملف محلياً لكن فشل الحذف من Supabase",
      },
    };
  }

  return { ok: true };
}
