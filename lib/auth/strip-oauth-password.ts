import type { User } from "@clerk/backend";
import { clerkClient } from "@clerk/nextjs/server";

const CLERK_API = "https://api.clerk.com/v1";

export type StripOAuthPasswordResult = {
  stripped: boolean;
  skipped: boolean;
  reason?: string;
  error?: string;
};

function hasOAuthExternalAccount(user: User): boolean {
  return (user.externalAccounts?.length ?? 0) > 0;
}

/** مستخدم اختار كلمة مرور بنفسه من إعدادات الحساب — لا نحذفها. */
export function userChoseOwnPassword(user: User): boolean {
  const meta = user.publicMetadata as Record<string, unknown> | undefined;
  return meta?.password_set_by_user === true;
}

/** هل يُرجّح أن كلمة المرور مؤقتة (أُضيفت تلقائياً لمسجّل OAuth)؟ */
export function shouldStripOAuthTempPassword(user: User): boolean {
  if (!user.passwordEnabled) return false;
  if (!hasOAuthExternalAccount(user)) return false;
  if (userChoseOwnPassword(user)) return false;
  const meta = user.publicMetadata as Record<string, unknown> | undefined;
  if (meta?.oauth_temp_password_stripped === true) return false;
  return true;
}

async function clerkDeleteUserPassword(userId: string): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) return { ok: false, error: "missing_clerk_secret" };

  const res = await fetch(`${CLERK_API}/users/${encodeURIComponent(userId)}/password`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });

  if (res.ok || res.status === 404) return { ok: true };
  const body = await res.text().catch(() => "");
  return { ok: false, error: `clerk_${res.status}:${body.slice(0, 200)}` };
}

/**
 * يزيل كلمة المرور من حسابات OAuth التي أُنشئت بكلمة مؤقتة.
 * الدخول يبقى عبر Google / Apple / X أو عبر تعيين كلمة مرور جديدة من إعدادات الحساب.
 */
export async function stripOAuthTempPassword(userId: string): Promise<StripOAuthPasswordResult> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  if (!shouldStripOAuthTempPassword(user)) {
    return {
      stripped: false,
      skipped: true,
      reason: !user.passwordEnabled
        ? "no_password"
        : !hasOAuthExternalAccount(user)
          ? "no_oauth"
          : userChoseOwnPassword(user)
            ? "user_chose_password"
            : "already_stripped",
    };
  }

  const removed = await clerkDeleteUserPassword(userId);
  if (!removed.ok) {
    return { stripped: false, skipped: false, error: removed.error };
  }

  try {
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...(user.publicMetadata as Record<string, unknown>),
        oauth_temp_password_stripped: true,
        oauth_temp_password_stripped_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn("[strip-oauth-password] metadata update failed", err);
  }

  return { stripped: true, skipped: false };
}

export type BulkStripReport = {
  scanned: number;
  stripped: number;
  skipped: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
};

/** تنظيف جماعي — للمالك أو سكربت الصيانة. */
export async function bulkStripOAuthTempPasswords(limit = 500): Promise<BulkStripReport> {
  const client = await clerkClient();
  const report: BulkStripReport = {
    scanned: 0,
    stripped: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  let offset = 0;
  const pageSize = 100;

  while (report.scanned < limit) {
    const page = await client.users.getUserList({ limit: pageSize, offset });
    const users = page.data ?? [];
    if (users.length === 0) break;

    for (const user of users) {
      if (report.scanned >= limit) break;
      report.scanned += 1;

      if (!shouldStripOAuthTempPassword(user)) {
        report.skipped += 1;
        continue;
      }

      const result = await stripOAuthTempPassword(user.id);
      if (result.stripped) {
        report.stripped += 1;
      } else if (result.skipped) {
        report.skipped += 1;
      } else {
        report.failed += 1;
        if (result.error) {
          report.errors.push({ userId: user.id, error: result.error });
        }
      }
    }

    if (users.length < pageSize) break;
    offset += pageSize;
  }

  return report;
}
