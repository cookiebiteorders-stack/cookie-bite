import { randomBytes } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { stripOAuthTempPassword } from "@/lib/auth/strip-oauth-password";

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

export type ProvisionResult = {
  username: string | null;
};

/**
 * يضبط اسم مستخدم فريداً من البريد/الاسم إن وُجد فراغ.
 * مسجّلو OAuth (Google وغيرها) يبقون بدون كلمة مرور — الدخول عبر نفس مزوّد الحساب فقط.
 */
export async function provisionClerkUsername(
  userId: string,
): Promise<ProvisionResult> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const firstName = user.firstName ?? null;
  const lastName = user.lastName ?? null;

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

  try {
    await stripOAuthTempPassword(userId);
  } catch (err) {
    console.warn("provisionClerk: strip OAuth temp password failed", err);
  }

  return { username };
}

/** @deprecated استخدم provisionClerkUsername */
export const provisionClerkUsernameAndPassword = provisionClerkUsername;
