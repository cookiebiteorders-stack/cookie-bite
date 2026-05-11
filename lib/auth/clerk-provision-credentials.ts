import { randomBytes } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";

function slugUsernameSegment(raw: string): string {
  const t = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return t;
}

function suggestUsernameBase(opts: {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  userId: string;
}): string {
  const local = opts.email?.split("@")[0]?.trim() ?? "";
  const fromEmail = slugUsernameSegment(local);
  const fromName = slugUsernameSegment(
    [opts.firstName, opts.lastName].filter(Boolean).join("_"),
  );
  let base =
    fromEmail.length >= 3
      ? fromEmail
      : fromName.length >= 3
        ? fromName
        : "";
  if (!base) base = `user_${opts.userId.replace(/[^a-z0-9]/gi, "").slice(-10) || "cookiebite"}`;
  if (base.length < 3) base = `user_${opts.userId.slice(-8)}`;
  if (base.length < 4) {
    base = `${base}_${opts.userId.replace(/\D/g, "").slice(-4) || "cb01"}`.slice(0, 28);
  }
  return base.slice(0, 28);
}

function generateTempPassword(): string {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  const num = "23456789";
  const sym = "@#$%";
  const buf = randomBytes(24);
  let out = "";
  for (let i = 0; i < 14; i++) {
    const pool = i % 5 === 0 ? sym : i % 2 === 0 ? alpha : num + alpha;
    out += pool[buf[i] % pool.length];
  }
  return `${out}Aa1`;
}

export type ProvisionResult = {
  username: string | null;
  passwordForEmail: string | null;
};

/**
 * يضبط اسم مستخدم فريداً من البريد/الاسم إن وُجد فراغ.
 * لمسجلي OAuth فقط (بدون كلمة مرور في Clerk): يضيف كلمة مرور مؤقتة قوية
 * لتمكين تسجيل الدخول بالبريد + كلمة المرور أيضاً.
 */
export async function provisionClerkUsernameAndPassword(
  userId: string,
): Promise<ProvisionResult> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const firstName = user.firstName ?? null;
  const lastName = user.lastName ?? null;

  const passwordEnabled = user.passwordEnabled;
  const externalCount = user.externalAccounts?.length ?? 0;
  const oauthOnly = externalCount > 0 && !passwordEnabled;

  let username = user.username ?? null;

  if (!username && email) {
    const base = suggestUsernameBase({
      email,
      firstName,
      lastName,
      userId,
    });
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate =
        attempt === 0 ? base : `${base}_${randomBytes(2).toString("hex")}`;
      try {
        const updated = await client.users.updateUser(userId, {
          username: candidate,
        });
        username = updated.username ?? candidate;
        break;
      } catch {
        /* تكرار عند تعارض الاسم */
      }
    }
  }

  let passwordForEmail: string | null = null;

  if (oauthOnly && email) {
    const temp = generateTempPassword();
    try {
      await client.users.updateUser(userId, { password: temp });
      passwordForEmail = temp;
    } catch (err) {
      console.error("provisionClerk: failed to set OAuth user password", err);
    }
  }

  return { username, passwordForEmail };
}
