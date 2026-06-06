import { clerkClient, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { adminRouteModuleMap, canAccess } from "@/lib/admin/rbac";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { PRODUCTION_HOST } from "@/lib/config/production-lock";
import { getOwnerFlags } from "@/lib/store/owner-flags-server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAccountRoute = createRouteMatcher(["/account(.*)"]);
const isWebhook = createRouteMatcher(["/api/webhooks(.*)"]);
const isMaintenanceBypass = createRouteMatcher([
  "/maintenance",
  "/admin(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/(.*)",
  "/_next/(.*)",
  "/favicon.ico",
  "/icon.png",
  "/icon.svg",
  "/manifest.webmanifest",
]);

/**
 * Rate limit في الذاكرة (يكفي لمرحلة الاختبار + Vercel Edge بعد التوسعة).
 * بدّله لـ Upstash/Vercel KV قبل الإنتاج عالي الحمل.
 */
const rateBuckets = new Map<string, { count: number; reset: number }>();

function rateOk(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || now > entry.reset) {
    rateBuckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

const tooMany = () =>
  NextResponse.json(
    { ok: false, error: { en: "Too many requests", ar: "طلبات كثيرة جداً" } },
    { status: 429 },
  );

function resolveModule(pathname: string) {
  const known = Object.keys(adminRouteModuleMap).sort((a, b) => b.length - a.length);
  const matched = known.find((route) => pathname === route || pathname.startsWith(`${route}/`));
  return matched ? adminRouteModuleMap[matched] : "dashboard";
}

export default clerkMiddleware(async (auth, request) => {
  const path = request.nextUrl.pathname;

  // 0) Canonical host enforcement (production فقط)
  if (process.env.NODE_ENV === "production") {
    const url = request.nextUrl;
    const host = (request.headers.get("host") ?? url.host).toLowerCase();
    const proto = (request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")).toLowerCase();
    const wrongHost =
      host !== PRODUCTION_HOST && host !== `www.${PRODUCTION_HOST}`;
    const wrongProto = proto !== "https";
    if (wrongHost || wrongProto || host.startsWith("www.")) {
      const target = new URL(url.toString());
      target.protocol = "https:";
      target.host = PRODUCTION_HOST;
      return NextResponse.redirect(target, 308);
    }
  }

  // 1) Webhooks تمر بدون أي تدخل (Clerk/Paymob/Sanity verify HMAC داخلياً)
  if (isWebhook(request)) {
    return;
  }

  // 1b) Maintenance mode — storefront only; admin + APIs stay up
  if (!isMaintenanceBypass(request)) {
    try {
      const flags = await getOwnerFlags();
      if (flags.maintenance_mode && path !== "/maintenance") {
        return NextResponse.redirect(new URL("/maintenance", request.url));
      }
    } catch {
      /* fail open — do not block traffic if flags cannot load */
    }
  }

  // 2) Rate limit للنقاط الحساسة
  if (path.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // حدّ عام يحمي ضد flood على كل المسارات بغض النظر عن النوع
    if (!rateOk(`all:${ip}`, 240, 60_000)) return tooMany();

    if (
      path.startsWith("/api/checkout") ||
      path.startsWith("/api/payments") ||
      path.startsWith("/api/orders")
    ) {
      if (!rateOk(`pay:${ip}`, 8, 60_000)) return tooMany();
    } else if (path.startsWith("/api/promo")) {
      if (!rateOk(`promo:${ip}`, 12, 60_000)) return tooMany();
    } else if (path.startsWith("/api/events")) {
      if (!rateOk(`events:${ip}`, 60, 60_000)) return tooMany();
    } else if (
      path.startsWith("/api/contact") ||
      path.startsWith("/api/newsletter")
    ) {
      if (!rateOk(`form:${ip}`, 5, 60_000)) return tooMany();
    } else if (
      path.startsWith("/api/wishlist") ||
      path.startsWith("/api/loyalty") ||
      path.startsWith("/api/push")
    ) {
      if (!rateOk(`user:${ip}`, 30, 60_000)) return tooMany();
    } else if (path.startsWith("/api/mr-brownie") || path.startsWith("/api/chat")) {
      if (!rateOk(`chat:${ip}`, 24, 60_000)) return tooMany();
    } else if (path.startsWith("/api/admin/")) {
      if (!rateOk(`admin:${ip}`, 60, 60_000)) return tooMany();
    } else if (path.startsWith("/api/revalidate")) {
      // tight limit — secret rotation/abuse مقاومة
      if (!rateOk(`reval:${ip}`, 10, 60_000)) return tooMany();
    }
  }

  // Cleanup العالم للذاكرة من entries منتهية (يحدث كل 5 دقائق تقريبياً)
  if (Math.random() < 0.001) {
    const now = Date.now();
    for (const [k, v] of rateBuckets) {
      if (v.reset < now) rateBuckets.delete(k);
    }
  }

  // 3) حماية /account
  if (isAccountRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      const signIn = new URL("/sign-in", request.url);
      signIn.searchParams.set(
        "redirect_url",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(signIn);
    }
    return NextResponse.next();
  }

  // 4) كل ما تبقى = عام، إلا لوحة الإدارة
  if (!isAdminRoute(request)) {
    return;
  }

  // 5) Admin RBAC
  const { userId } = await auth();
  if (!userId) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set(
      "redirect_url",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(signIn);
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress ?? null;

  const role = await resolveStaffRole({ email, clerkUserId: userId });
  if (!["owner", "admin", "staff"].includes(role)) {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  const adminModule = resolveModule(request.nextUrl.pathname);
  if (!canAccess(role, adminModule)) {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc|__clerk)(.*)",
  ],
};
