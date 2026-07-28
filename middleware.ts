import { NextResponse, type NextRequest } from "next/server";
import { adminRouteModuleMap, canAccess } from "@/lib/admin/rbac";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { PRODUCTION_HOST } from "@/lib/config/production-lock";
import { getOwnerFlags } from "@/lib/store/owner-flags-server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { getBaseUrl } from "@/lib/auth/safe-redirect";

const isAdminRoute = (pathname: string) =>
  pathname === "/admin" || pathname.startsWith("/admin/");
const isAccountRoute = (pathname: string) =>
  pathname === "/account" || pathname.startsWith("/account/");
const isWebhook = (pathname: string) =>
  pathname === "/api/webhooks" || pathname.startsWith("/api/webhooks/");
const isMaintenanceBypass = (pathname: string) =>
  pathname === "/maintenance" ||
  isAdminRoute(pathname) ||
  pathname.startsWith("/sign-in") ||
  pathname.startsWith("/sign-up") ||
  pathname.startsWith("/forgot-password") ||
  pathname.startsWith("/reset-password") ||
  pathname.startsWith("/api/") ||
  pathname.startsWith("/_next/") ||
  pathname === "/favicon.ico" ||
  pathname === "/icon.png" ||
  pathname === "/icon.svg" ||
  pathname === "/manifest.webmanifest";

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

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

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

  if (isWebhook(path)) {
    return NextResponse.next();
  }

  // Route Handlers must never be redirected — clients expect JSON.
  // Session refresh still runs below, but no redirect / 403 rewrite.
  const isRouteHandler = path.startsWith("/api/");

  if (!isMaintenanceBypass(path)) {
    try {
      const flags = await getOwnerFlags();
      if (flags.maintenance_mode && path !== "/maintenance") {
        const origin = process.env.NODE_ENV === "development" ? request.nextUrl.origin.replace("0.0.0.0", "localhost").replace("https://localhost", "http://localhost") : getBaseUrl();
        return NextResponse.redirect(new URL("/maintenance", origin));
      }
    } catch {
      /* fail open */
    }
  }

  if (path.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

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
      path.startsWith("/api/newsletter") ||
      path.startsWith("/api/corporate")
    ) {
      if (!rateOk(`form:${ip}`, 5, 60_000)) return tooMany();
    } else if (path.startsWith("/api/auth/")) {
      // Password reset, etc. — tight bucket to prevent email-bombing / account enumeration abuse.
      if (!rateOk(`auth:${ip}`, 5, 60_000)) return tooMany();
    } else if (path.startsWith("/api/geocode")) {
      // Proxies third-party geocoders (Nominatim usage policy is ~1 req/sec globally) — keep our shared IP well under any ban threshold.
      if (!rateOk(`geo:${ip}`, 20, 60_000)) return tooMany();
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
      if (!rateOk(`reval:${ip}`, 10, 60_000)) return tooMany();
    }
  }

  if (Math.random() < 0.001) {
    const now = Date.now();
    for (const [k, v] of rateBuckets) {
      if (v.reset < now) rateBuckets.delete(k);
    }
  }

  // Always refresh the Supabase session cookie for API routes so Route Handlers
  // called from an authenticated client see a fresh access token.
  const needsAuth =
    isAccountRoute(path) ||
    isAdminRoute(path) ||
    path.startsWith("/api/account/") ||
    path.startsWith("/api/admin/");
  const { response, user } = needsAuth
    ? await updateSupabaseSession(request)
    : { response: NextResponse.next({ request }), user: null as null };
  response.headers.set("x-mw", needsAuth ? "auth" : "pass");

  if (isAccountRoute(path) && !isRouteHandler) {
    if (!user) {
      const origin = process.env.NODE_ENV === "development" ? request.nextUrl.origin.replace("0.0.0.0", "localhost").replace("https://localhost", "http://localhost") : getBaseUrl();
      const signIn = new URL("/sign-in", origin);
      signIn.searchParams.set(
        "redirect_url",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(signIn);
    }
    return response;
  }

  if (!isAdminRoute(path)) {
    return response;
  }

  if (!user) {
    const origin = process.env.NODE_ENV === "development" ? request.nextUrl.origin.replace("0.0.0.0", "localhost").replace("https://localhost", "http://localhost") : getBaseUrl();
    const signIn = new URL("/sign-in", origin);
    signIn.searchParams.set(
      "redirect_url",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(signIn);
  }

  const email = user.email ?? null;
  const role = await resolveStaffRole({ email, supabaseUserId: user.id });
  if (!["owner", "admin", "staff"].includes(role)) {
    const origin = process.env.NODE_ENV === "development" ? request.nextUrl.origin.replace("0.0.0.0", "localhost").replace("https://localhost", "http://localhost") : getBaseUrl();
    return NextResponse.redirect(new URL("/403", origin));
  }

  const adminModule = resolveModule(request.nextUrl.pathname);
  if (!canAccess(role, adminModule)) {
    const origin = process.env.NODE_ENV === "development" ? request.nextUrl.origin.replace("0.0.0.0", "localhost").replace("https://localhost", "http://localhost") : getBaseUrl();
    return NextResponse.redirect(new URL("/403", origin));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
