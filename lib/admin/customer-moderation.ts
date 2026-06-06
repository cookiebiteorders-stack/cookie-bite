import { clerkClient } from "@clerk/nextjs/server";
import { blockEmail } from "@/lib/db/blocked-emails";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminActor } from "@/lib/admin/require-admin";

export type CustomerModerationTarget = {
  id: string;
  email: string;
  clerk_user_id: string;
  role: string;
};

export function isManualCrmClerkId(clerkUserId: string): boolean {
  return clerkUserId.startsWith("crm-manual:");
}

export async function loadCustomerModerationTarget(
  userId: string,
): Promise<CustomerModerationTarget | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id,email,clerk_user_id,role")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as CustomerModerationTarget;
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

function clerkErrorLooksBenign(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /not found|already|banned|deleted/i.test(msg);
}

async function banClerkUser(clerkUserId: string): Promise<void> {
  if (isManualCrmClerkId(clerkUserId)) return;
  try {
    const client = await clerkClient();
    await client.users.banUser(clerkUserId);
  } catch (err) {
    if (clerkErrorLooksBenign(err)) return;
    console.error("banClerkUser failed", clerkUserId, err);
    throw err;
  }
}

async function deleteClerkUser(clerkUserId: string): Promise<void> {
  if (isManualCrmClerkId(clerkUserId)) return;
  try {
    const client = await clerkClient();
    await client.users.deleteUser(clerkUserId);
  } catch (err) {
    if (clerkErrorLooksBenign(err)) return;
    console.error("deleteClerkUser failed", clerkUserId, err);
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
    await banClerkUser(input.target.clerk_user_id);
  } catch {
    return {
      ok: false,
      message: {
        en: "Email blocked locally but Clerk ban failed",
        ar: "تم حظر البريد محلياً لكن فشل الحظر في Clerk",
      },
    };
  }

  return { ok: true };
}

/** Remove customer profile only — does not block the email for re-registration. */
export async function deleteCustomerAccount(input: {
  target: CustomerModerationTarget;
}): Promise<{ ok: true } | { ok: false; message: { en: string; ar: string } }> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("users").delete().eq("id", input.target.id);
  if (error) {
    console.error("deleteCustomerAccount db error", error);
    return {
      ok: false,
      message: { en: "Failed to delete customer", ar: "تعذّر حذف العميل" },
    };
  }

  try {
    await deleteClerkUser(input.target.clerk_user_id);
  } catch {
    return {
      ok: false,
      message: {
        en: "Customer removed from database but Clerk delete failed",
        ar: "تم حذف العميل من قاعدة البيانات لكن فشل الحذف من Clerk",
      },
    };
  }

  return { ok: true };
}

/** Block email, remove Clerk access, and delete the CRM profile. */
export async function blockAndDeleteCustomerAccount(input: {
  target: CustomerModerationTarget;
  actor: AdminActor;
  reason?: string | null;
}): Promise<{ ok: true } | { ok: false; message: { en: string; ar: string } }> {
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
  const { error } = await supabase.from("users").delete().eq("id", input.target.id);
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
    await deleteClerkUser(input.target.clerk_user_id);
  } catch {
    return {
      ok: false,
      message: {
        en: "Email blocked and profile removed, but Clerk delete failed",
        ar: "تم الحظر وحذف الملف محلياً لكن فشل الحذف من Clerk",
      },
    };
  }

  return { ok: true };
}
