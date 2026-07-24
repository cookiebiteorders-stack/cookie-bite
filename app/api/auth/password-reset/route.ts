import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserByEmail } from "@/lib/db/users";
import { onPasswordReset } from "@/lib/email/automation/triggers";

const bodySchema = z.object({
  email: z.string().email(),
});

function resolveResetLink(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "");
  if (!appUrl) return "https://cookie-bite.com/sign-in";
  return `${appUrl}/sign-in`;
}

/**
 * Password reset request endpoint.
 * - Always returns a generic success response (prevents account enumeration).
 * - If user exists, triggers the DB-template email automation flow.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  try {
    const user = await getUserByEmail(email);
    if (user?.email) {
      // Fire-and-forget: don't let the extra email-trigger latency create a
      // timing side-channel that reveals whether this email is registered.
      void onPasswordReset({
        email: user.email,
        userId: user.id,
        userName: user.full_name ?? undefined,
        resetLink: resolveResetLink(),
      }).catch((error) => {
        console.error("password reset trigger failed", error);
      });
    }
  } catch (error) {
    console.error("password reset lookup failed", error);
  }

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for this email, a reset message has been sent.",
  });
}
