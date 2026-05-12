import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  isGuestSessionUuid,
  MR_BROWNIE_GUEST_SESSION_COOKIE,
} from "@/lib/mr-brownie/guest-session-constants";

/** يضمن كوكي جلسة ضيف (24 ساعة) لربط سجل Mr. Brownie بدون تسجيل دخول */
export async function POST() {
  const jar = await cookies();
  const existing = jar.get(MR_BROWNIE_GUEST_SESSION_COOKIE)?.value;
  const sid = isGuestSessionUuid(existing) ? existing : crypto.randomUUID();

  const res = NextResponse.json({ ok: true as const });
  res.cookies.set(MR_BROWNIE_GUEST_SESSION_COOKIE, sid, {
    path: "/",
    maxAge: 86_400,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
