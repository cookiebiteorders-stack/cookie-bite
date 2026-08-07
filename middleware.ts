import { NextResponse, type NextRequest } from "next/server";
import { adminRouteModuleMap, canAccess } from "@/lib/admin/rbac";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { PRODUCTION_HOST } from "@/lib/config/production-lock";
import { getOwnerFlags } from "@/lib/store/owner-flags-server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { getBaseUrl } from "@/lib/auth/safe-redirect";
import { rateOk as redisRateOk } from "@/lib/rate-limit/redis-rate-limiter";
import { getRequestId, getRequestIdHeader } from "@/lib/observability/request-id";

// Trusted proxy CIDR ranges - only these proxies can set X-Forwarded-* headers
const TRUSTED_PROXY_CIDRS = process.env.TRUSTED_PROXY_CIDRS
  ? process.env.TRUSTED_PROXY_CIDRS.split(",").map((s) => s.trim())
  : ["127.0.0.1", "::1"]; // Default to localhost only

function isTrustedProxy(ip: string): boolean {
  if (!ip) return false;
  // Exact match for IPv4/IPv6 addresses
  if (TRUSTED_PROXY_CIDRS.includes(ip)) return true;
  // CIDR matching could be added here for more complex ranges
  return false;
}

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
  pathname.startsWith("/api/webhooks") || // Webhooks need to work even during maintenance
  pathname.startsWith("/_next/") ||
  pathname === "/favicon.ico" ||
  pathname === "/icon.png" ||
  pathname === "/icon.svg" ||
  pathname === "/manifest.webmanifest";

const tooMany = () =>
  NextResponse.json(
    { ok: false, error: { en: "Too many requests", ar: "طلبات كثيرة جداً" } },
    { status: 429 },
  );

function resolveModule(pathname: string) {
  const known = Object.keys(adminRouteModuleMap).sort((a, b) => b.length - a.length);
  // Exact match or prefix with trailing slash only - prevents path collision attacks
  const match = known.find((route) => pathname === route || pathname.startsWith(`${route}/`));
  return match ? adminRouteModuleMap[match] : "dashboard";
}

export default async function middleware(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;

    // Generate or extract request ID for distributed tracing
    const requestId = getRequestId(request.headers);
    const requestIdHeader = getRequestIdHeader();

    if (process.env.NODE_ENV === "production") {
      const url = request.nextUrl;
      const remoteAddr = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                        request.headers.get("x-real-ip") || 
                      "unknown";
      
      // Only trust X-Forwarded-* headers from trusted proxies
      const trusted = isTrustedProxy(remoteAddr);
      const host = (request.headers.get("host") ?? url.host).toLowerCase();
      const proto = trusted 
        ? (request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")).toLowerCase()
        : url.protocol.replace(":", "").toLowerCase();
      
      const wrongHost =
        host !== PRODUCTION_HOST && host !== `www.${PRODUCTION_HOST}`;
      const wrongProto = proto !== "https";
      if (wrongHost || wrongProto || host.startsWith("www.")) {
        const target = new URL(url.toString());
        target.protocol = "https:";
        target.host = PRODUCTION_HOST;
        const response = NextResponse.redirect(target, 308);
        response.headers.set(requestIdHeader, requestId);
        return response;
      }
    }

    if (isWebhook(path)) {
      const response = NextResponse.next();
      response.headers.set(requestIdHeader, requestId);
      return response;
    }

    // Route Handlers must never be redirected — clients expect JSON.
    // Session refresh still runs below, but no redirect / 403 rewrite.
    const isRouteHandler = path.startsWith("/api/");

    if (!isMaintenanceBypass(request.nextUrl.pathname)) {
      try {
        const flags = await getOwnerFlags();
        if (flags.maintenance_mode && path !== "/maintenance") {
          const origin = process.env.NODE_ENV === "development" ? request.nextUrl.origin.replace("0.0.0.0", "localhost").replace("https://localhost", "http://localhost") : getBaseUrl();
          const response = NextResponse.redirect(new URL("/maintenance", origin));
          response.headers.set(requestIdHeader, requestId);
          return response;
        }
      } catch (error) {
        console.error("===== MIDDLEWARE MAINTENANCE CHECK ERROR =====");
        console.error(error);
        if (error instanceof Error) {
          console.error(error.stack);
        }
        console.error({ url: request.url, method: request.method, env: process.env.NODE_ENV });
        // In production, fail closed on maintenance check errors for non-public routes
        if (process.env.NODE_ENV === "production" && (isAdminRoute(path) || isAccountRoute(path))) {
          const errorResponse = NextResponse.json(
            { ok: false, error: "Service unavailable" },
            { status: 503 }
          );
          errorResponse.headers.set(requestIdHeader, requestId);
          return errorResponse;
        }
        // For public routes, fail open but log the error
      }
    }

  if (path.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Increased general API rate limit for better capacity
    if (!(await redisRateOk(`all:${ip}`, 480, 60_000))) {
      const response = tooMany();
      response.headers.set(requestIdHeader, requestId);
      return response;
    }

    if (
      path.startsWith("/api/checkout") ||
      path.startsWith("/api/payments") ||
      path.startsWith("/api/orders")
    ) {
      // Increased payment-related rate limit for legitimate checkout traffic
      if (!(await redisRateOk(`pay:${ip}`, 15, 60_000))) {
        const response = tooMany();
        response.headers.set(requestIdHeader, requestId);
        return response;
      }
    } else if (path.startsWith("/api/promo")) {
      // Increased promo code validation limit
      if (!(await redisRateOk(`promo:${ip}`, 20, 60_000))) {
        const response = tooMany();
        response.headers.set(requestIdHeader, requestId);
        return response;
      }
    } else if (path.startsWith("/api/events")) {
      if (!(await redisRateOk(`events:${ip}`, 60, 60_000))) {
        const response = tooMany();
        response.headers.set(requestIdHeader, requestId);
        return response;
      }
    } else if (
      path.startsWith("/api/contact") ||
      path.startsWith("/api/newsletter") ||
      path.startsWith("/api/corporate")
    ) {
      if (!(await redisRateOk(`form:${ip}`, 5, 60_000))) {
        const response = tooMany();
        response.headers.set(requestIdHeader, requestId);
        return response;
      }
    } else if (path.startsWith("/api/auth/")) {
      // Password reset, etc. — tight bucket to prevent email-bombing / account enumeration abuse.
      if (!(await redisRateOk(`auth:${ip}`, 5, 60_000))) {
        const response = tooMany();
        response.headers.set(requestIdHeader, requestId);
        return response;
      }
    } else if (path.startsWith("/api/account/")) {
      // Profile completion - allow generous rate for legitimate form submissions
      if (!(await redisRateOk(`account:${ip}`, 30, 60_000))) {
        const response = tooMany();
        response.headers.set(requestIdHeader, requestId);
        return response;
      }
    } else if (path.startsWith("/api/geocode")) {
      // Proxies third-party geocoders (Nominatim usage policy is ~1 req/sec globally) — keep our shared IP well under any ban threshold.
      if (!(await redisRateOk(`geo:${ip}`, 20, 60_000))) {
        const response = tooMany();
        response.headers.set(requestIdHeader, requestId);
        return response;
      }
    } else if (
      path.startsWith("/api/wishlist") ||
      path.startsWith("/api/loyalty") ||
      path.startsWith("/api/push")
    ) {
      // Increased user feature rate limit for better UX
      if (!(await redisRateOk(`user:${ip}`, 50, 60_000))) {
        const response = tooMany();
        response.headers.set(requestIdHeader, requestId);
        return response;
      }
    } else if (path.startsWith("/api/mr-brownie") || path.startsWith("/api/chat")) {
      // Moderately increased chat rate limit for AI features
      if (!(await redisRateOk(`chat:${ip}`, 30, 60_000))) {
        const response = tooMany();
        response.headers.set(requestIdHeader, requestId);
        return response;
      }
    } else if (path.startsWith("/api/admin/")) {
      // Increased admin rate limit for dashboard operations
      if (!(await redisRateOk(`admin:${ip}`, 90, 60_000))) {
        const response = tooMany();
        response.headers.set(requestIdHeader, requestId);
        return response;
      }
    } else if (path.startsWith("/api/revalidate")) {
      if (!(await redisRateOk(`reval:${ip}`, 10, 60_000))) {
        const response = tooMany();
        response.headers.set(requestIdHeader, requestId);
        return response;
      }
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
  response.headers.set(requestIdHeader, requestId);

  if (isAccountRoute(path) && !isRouteHandler) {
    if (!user) {
      const origin = process.env.NODE_ENV === "development" ? request.nextUrl.origin.replace("0.0.0.0", "localhost").replace("https://localhost", "http://localhost") : getBaseUrl();
      const signIn = new URL("/sign-in", origin);
      signIn.searchParams.set(
        "redirect_url",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      const redirectResponse = NextResponse.redirect(signIn);
      redirectResponse.headers.set(requestIdHeader, requestId);
      return redirectResponse;
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
    const redirectResponse = NextResponse.redirect(signIn);
    redirectResponse.headers.set(requestIdHeader, requestId);
    return redirectResponse;
  }

  const email = user.email ?? null;
  const role = await resolveStaffRole({ email, supabaseUserId: user.id });
  if (!["owner", "admin", "staff"].includes(role)) {
    const origin = process.env.NODE_ENV === "development" ? request.nextUrl.origin.replace("0.0.0.0", "localhost").replace("https://localhost", "http://localhost") : getBaseUrl();
    const redirectResponse = NextResponse.redirect(new URL("/403", origin));
    redirectResponse.headers.set(requestIdHeader, requestId);
    return redirectResponse;
  }

  const adminModule = resolveModule(request.nextUrl.pathname);
  if (!canAccess(role, adminModule)) {
    const origin = process.env.NODE_ENV === "development" ? request.nextUrl.origin.replace("0.0.0.0", "localhost").replace("https://localhost", "http://localhost") : getBaseUrl();
    const redirectResponse = NextResponse.redirect(new URL("/403", origin));
    redirectResponse.headers.set(requestIdHeader, requestId);
    return redirectResponse;
  }

  return response;
  } catch (error) {
    console.error("[middleware] Unexpected error:", error);
    const requestId = getRequestId(request.headers);
    const requestIdHeader = getRequestIdHeader();
    const requestPath = request.nextUrl.pathname;
    
    // Fail closed for protected routes in production
    const isProtectedRoute = 
      isAdminRoute(requestPath) || 
      isAccountRoute(requestPath) || 
      requestPath.startsWith("/api/admin/") || 
      requestPath.startsWith("/api/account/");
    
    if (isProtectedRoute && process.env.NODE_ENV === "production") {
      const errorResponse = NextResponse.json(
        { ok: false, error: "Middleware failure - service unavailable" },
        { status: 503 }
      );
      errorResponse.headers.set(requestIdHeader, requestId);
      return errorResponse;
    }
    
    // Fail open for public/static pages in development or non-protected routes
    const response = NextResponse.next();
    response.headers.set(requestIdHeader, requestId);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
